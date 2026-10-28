/* แดชบอร์ดเจ้าหน้าที่ (admin / coach) — ข้อมูลจริงจาก REST API
   - admin เห็นข้อมูลทุกส่วน, coach เห็นเฉพาะนัดและลูกค้าของตนเอง
   - การตรวจสิทธิ์ขั้นสุดท้ายอยู่ที่ Backend (JWT + role) */
(() => {
  'use strict';

  const API = window.SSFAPI;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const day = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('th-TH') : 'ยังไม่ระบุ';
  const timeStamp = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const section = (id, title, body) => `<section id="${id}" class="card"><h2>${title}</h2>${body}</section>`;
  const empty = message => `<div class="empty">${message}</div>`;
  const badge = (label, tone = '') => `<span class="state${tone ? ` ${tone}` : ''}">${esc(label)}</span>`;
  const stats = items => `<div class="stats">${items.map(([value, label]) => `<div class="card"><p>${esc(label)}</p><div class="value">${esc(value)}</div></div>`).join('')}</div>`;

  const STATUS = {
    requested: { label: 'รอยืนยัน', tone: '' },
    confirmed: { label: 'ยืนยันแล้ว', tone: 'good' },
    cancelled: { label: 'ยกเลิกแล้ว', tone: 'warn' },
    completed: { label: 'เสร็จสิ้น', tone: 'good' },
    no_show: { label: 'ไม่มา', tone: 'warn' }
  };
  const ENTITLEMENT_STATUS = {
    pending: { label: 'รอตรวจสอบ', tone: '' },
    confirmed: { label: 'ยืนยันแล้ว', tone: 'good' },
    cancelled: { label: 'ยกเลิก', tone: 'warn' },
    expired: { label: 'หมดอายุ', tone: 'warn' }
  };
  const CARD_STATUS = {
    pending: { label: 'รอเปิดใช้งาน', tone: '' },
    active: { label: 'ใช้งานได้', tone: 'good' },
    suspended: { label: 'ถูกระงับ', tone: 'warn' }
  };
  const stateOf = (item, map) => map[item.status] || { label: item.status, tone: '' };

  function notify(message, isError = false) {
    const box = $('#staff-message');
    if (!box) return;
    box.textContent = message;
    box.style.color = isError ? '#b42318' : '';
  }

  function roleStrip(user, description) {
    const role = window.SSFRoles ? window.SSFRoles.roleOf(user) : user.role;
    const label = window.SSFRoles ? window.SSFRoles.roleLabel(role) : role;
    const icon = role === 'admin' ? 'AD' : role === 'coach' ? 'CO' : 'MB';
    return `<section class="card role-card">
      <div class="identity">
        <span class="role-avatar" aria-hidden="true">${icon}</span>
        <div>
          <p class="small">เข้าสู่ระบบในบทบาท ${esc(label)}</p>
          <h2>${esc(user.fullName || user.name || user.email)}</h2>
          <p class="small">${esc(user.email)} · ${esc(description)}</p>
        </div>
        ${badge(label, 'good')}
      </div>
    </section>`;
  }

  function appointmentButtons(item) {
    if (!['requested', 'confirmed'].includes(item.status)) return '';
    const buttons = [];
    if (item.status === 'requested') buttons.push(`<button class="secondary" data-appt-status="confirmed" data-appt-id="${item.id}">ยืนยัน</button>`);
    if (item.status === 'confirmed') buttons.push(`<button class="secondary" data-appt-status="completed" data-appt-id="${item.id}">เสร็จสิ้น</button>`);
    buttons.push(`<button class="secondary" data-appt-status="cancelled" data-appt-id="${item.id}">ยกเลิก</button>`);
    return `<div class="actions-inline">${buttons.join(' ')}</div>`;
  }

  function appointmentTable(list, { showTrainer = false } = {}) {
    if (!list.length) return empty('ยังไม่มีนัดหมายตามเงื่อนไขนี้');
    const sorted = [...list].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return `<div class="scroll"><table class="staff-table"><thead><tr>
      <th>วัน / เวลา</th><th>สมาชิก</th>${showTrainer ? '<th>เทรนเนอร์</th>' : ''}<th>สถานะ</th><th>จัดการ</th>
    </tr></thead><tbody>${sorted.map(item => {
      const state = stateOf(item, STATUS);
      return `<tr>
        <td>${day(item.date)}<br><span class="small">${esc(item.time)}</span></td>
        <td>${esc(item.memberName || '-')}<br><span class="small">${esc(item.memberEmail || '')}</span></td>
        ${showTrainer ? `<td>${esc(item.trainerName || '-')}</td>` : ''}
        <td>${badge(state.label, state.tone)}</td>
        <td>${appointmentButtons(item)}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }

  /* ---------------- Admin ---------------- */
  async function renderAdmin(user) {
    const root = $('#staff-content');
    const [dashboard, cardData] = await Promise.all([
      API.getAdminDashboard(),
      API.getRfidCards().catch(() => ({ cards: [] }))
    ]);
    const members = dashboard.members || [];
    const appointments = dashboard.appointments || [];
    const coaches = dashboard.coaches || [];
    const entitlements = dashboard.entitlements || [];
    const cards = cardData.cards || [];
    const summary = dashboard.summary;

    root.innerHTML = roleStrip(user, 'เห็นข้อมูลสมาชิก นัดหมาย และทีมเทรนเนอร์ทั้งหมด') +
      `<div id="overview">${stats([
        [summary.members, 'บัญชีสมาชิก'],
        [summary.activeEntitlements, 'สิทธิ์ที่ใช้งานอยู่'],
        [summary.pendingEntitlements, 'สิทธิ์รอตรวจสอบ'],
        [summary.todayAppointments, 'นัดวันนี้'],
        [summary.coaches, 'เทรนเนอร์ในทีม'],
        [summary.cancelledAppointments, 'นัดที่ถูกยกเลิก']
      ])}</div>` +
      section('members', 'สมาชิกและสิทธิ์', `
        <div class="toolbar">
          <div><label for="member-search">ค้นหาชื่อหรืออีเมล</label><input id="member-search" type="search" placeholder="ค้นหาสมาชิก"></div>
          <div><label for="member-status">สิทธิ์เข้าใช้</label><select id="member-status">
            <option value="all">ทั้งหมด</option>
            <option value="active">มีสิทธิ์ใช้งานอยู่</option>
            <option value="pending">ยังไม่มีสิทธิ์ปัจจุบัน</option>
          </select></div>
        </div>
        <div id="member-list"></div>`) +
      section('entitlements', 'รายการสิทธิ์รอตรวจสอบ', '<div id="entitlement-list"></div>') +
      section('appointments', 'นัดหมายทั้งหมด', `
        <div class="toolbar">
          <div><label for="appointment-day">วันที่ (เว้นว่างเพื่อดูทั้งหมด)</label><input id="appointment-day" type="date"></div>
          <div><label for="appointment-coach">เทรนเนอร์</label><select id="appointment-coach">
            <option value="">ทุกคน</option>
            ${coaches.map(coach => `<option value="${esc(coach.id)}">${esc(coach.name)}</option>`).join('')}
          </select></div>
        </div>
        <div id="appointment-list"></div>`) +
      section('coaches', 'ทีมเทรนเนอร์และภาระงาน', `<div class="cards">${coaches.map(coach => `
        <div>
          <h3>${esc(coach.name)}</h3>
          <p class="small">${esc(coach.role)}</p>
          <p>${esc((coach.schedule || []).join(' / '))}</p>
          <p class="small">นัดที่ยังเปิดอยู่ ${coach.upcoming} รายการ · นัดทั้งหมด ${coach.total} · ลูกค้า ${coach.clients} คน</p>
        </div>`).join('')}</div>`) +
      section('rfid', 'บัตร RFID', badge(`${summary.cards} บัตรในระบบ`) +
        `<div class="cards">${['pending', 'active', 'suspended'].map(status => `<div><p>${CARD_STATUS[status].label}</p><div class="value">${dashboard.rfid[status] || 0}</div></div>`).join('')}</div>` +
        `<form id="rfid-form">
          <label for="rfid-member">สมาชิก</label>
          <select id="rfid-member" required>${members.map(member => `<option value="${member.id}">${esc(member.fullName)} · ${esc(member.email)}</option>`).join('')}</select>
          <label for="rfid-uid">หมายเลขบัตร</label>
          <input id="rfid-uid" required maxlength="64" placeholder="เช่น RFID-0001">
          <button type="submit">ออกบัตร (รอเปิดใช้งาน)</button>
        </form>
        <div id="rfid-list"></div>`);

    const activeEntitlement = member => (member.entitlements || []).some(item => item.active);

    const filterMembers = () => {
      const query = $('#member-search').value.trim().toLowerCase();
      const filter = $('#member-status').value;
      const list = members.filter(member => {
        const matchesQuery = `${member.fullName} ${member.email}`.toLowerCase().includes(query);
        const isActive = activeEntitlement(member);
        const matchesStatus = filter === 'all' || (filter === 'active') === isActive;
        return matchesQuery && matchesStatus;
      });
      $('#member-list').innerHTML = list.length
        ? `<div class="scroll"><table class="staff-table"><thead><tr>
            <th>สมาชิก</th><th>บริการ / แพ็กเกจ</th><th>เทรนเนอร์</th><th>สิทธิ์ / วันหมดอายุ</th><th>บัญชี</th>
          </tr></thead><tbody>${list.map(member => {
            const fitness = (member.entitlements || []).find(item => item.kind === 'fitness');
            const personal = (member.entitlements || []).find(item => item.kind === 'trainer');
            const state = fitness ? stateOf(fitness, ENTITLEMENT_STATUS) : { label: 'ยังไม่มี', tone: '' };
            return `<tr>
              <td>${esc(member.fullName)}<br><span class="small">${esc(member.email)}</span></td>
              <td>${esc(fitness?.packageName || member.fitnessPackageName || 'ไม่ได้เลือกฟิตเนส')}<br><span class="small">${esc(personal?.packageName || member.trainerPackageName || 'ไม่ได้เลือกฝึกส่วนตัว')}</span></td>
              <td>${esc(member.coachName || 'ยังไม่เลือก')}</td>
              <td>${badge(state.label, state.tone)}<br><span class="small">หมดอายุ ${day(fitness?.expireDate)}</span></td>
              <td>${badge(member.status === 'active' ? 'ใช้งาน' : 'ถูกระงับ', member.status === 'active' ? 'good' : 'warn')}<br>
                <button class="secondary" data-member-status="${member.status === 'active' ? 'suspended' : 'active'}" data-member-id="${member.id}">${member.status === 'active' ? 'ระงับ' : 'เปิดใช้'}</button></td>
            </tr>`;
          }).join('')}</tbody></table></div>`
        : empty('ไม่พบสมาชิกตามเงื่อนไข');
    };

    const renderEntitlements = () => {
      const pending = entitlements.filter(item => item.status === 'pending');
      $('#entitlement-list').innerHTML = pending.length
        ? `<div class="scroll"><table class="staff-table"><thead><tr><th>สมาชิก</th><th>ชนิด</th><th>แพ็กเกจ</th><th>ช่วงสิทธิ์</th><th>จัดการ</th></tr></thead><tbody>${pending.map(item => `<tr>
            <td>${esc(item.memberName)}<br><span class="small">${esc(item.memberEmail)}</span></td>
            <td>${item.kind === 'fitness' ? 'ฟิตเนส' : 'ฝึกส่วนตัว'}</td>
            <td>${esc(item.packageName || item.packageId)}</td>
            <td>${dateRange(item)}</td>
            <td><button class="secondary" data-ent-status="confirmed" data-ent-id="${item.id}">ยืนยันสิทธิ์</button>
              <button class="secondary" data-ent-status="cancelled" data-ent-id="${item.id}">ยกเลิก</button></td>
          </tr>`).join('')}</tbody></table></div>`
        : empty('ไม่มีสิทธิ์ที่รอตรวจสอบ');
    };

    const filterAppointments = () => {
      const date = $('#appointment-day').value;
      const trainerId = $('#appointment-coach').value;
      $('#appointment-list').innerHTML = appointmentTable(
        appointments.filter(item => (!date || item.date === date) && (!trainerId || item.trainerId === trainerId)),
        { showTrainer: true }
      );
    };

    const renderCards = () => {
      $('#rfid-list').innerHTML = cards.length
        ? `<div class="scroll"><table class="staff-table"><thead><tr><th>สมาชิก</th><th>หมายเลขบัตร</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${cards.map(card => `<tr>
            <td>${esc(card.memberName)}<br><span class="small">${esc(card.memberEmail)}</span></td>
            <td>${esc(card.cardUid)}</td>
            <td>${badge(stateOf(card, CARD_STATUS).label, stateOf(card, CARD_STATUS).tone)}</td>
            <td>${['pending', 'active', 'suspended'].filter(status => status !== card.status).map(status =>
              `<button class="secondary" data-card-status="${status}" data-card-id="${card.id}">${CARD_STATUS[status].label}</button>`
            ).join(' ')}</td>
          </tr>`).join('')}</tbody></table></div>`
        : empty('ยังไม่มีบัตรในระบบ');
    };

    $('#member-search').oninput = $('#member-status').onchange = filterMembers;
    $('#appointment-day').onchange = $('#appointment-coach').onchange = filterAppointments;
    filterMembers();
    renderEntitlements();
    filterAppointments();
    renderCards();

    $('#rfid-form').onsubmit = async event => {
      event.preventDefault();
      const memberId = $('#rfid-member').value;
      const cardUid = $('#rfid-uid').value.trim();
      if (!memberId || !cardUid) return;
      try {
        await API.issueRfidCard({ memberId, cardUid });
        notify('ออกบัตรแล้ว สถานะรอเปิดใช้งาน');
        await renderAdmin(user);
      } catch (error) {
        notify(error.message, true);
      }
    };

    if (root._adminHandler) root.removeEventListener('click', root._adminHandler);
    root._adminHandler = async event => {
      const button = event.target.closest('button[data-appt-status],button[data-ent-status],button[data-member-status],button[data-card-status]');
      if (!button) return;
      button.disabled = true;
      try {
        if (button.dataset.apptId) {
          await API.setAdminAppointmentStatus(button.dataset.apptId, button.dataset.apptStatus);
          notify('อัปเดตสถานะนัดแล้ว');
        } else if (button.dataset.entId) {
          await API.setEntitlementStatus(button.dataset.entId, { status: button.dataset.entStatus });
          notify('อัปเดตสิทธิ์แล้ว');
        } else if (button.dataset.memberId) {
          await API.setMemberStatus(button.dataset.memberId, button.dataset.memberStatus);
          notify('อัปเดตสถานะบัญชีแล้ว');
        } else if (button.dataset.cardId) {
          await API.setRfidStatus(button.dataset.cardId, button.dataset.cardStatus);
          notify('อัปเดตสถานะบัตรแล้ว');
        }
        await renderAdmin(user);
      } catch (error) {
        notify(error.message, true);
        button.disabled = false;
      }
    };
    root.addEventListener('click', root._adminHandler);
  }

  function dateRange(item) {
    if (item.kind === 'fitness') return `${day(item.startDate)} – ${day(item.expireDate)}`;
    return `${item.sessionsUsed ?? 0} / ${item.sessionsTotal ?? '-'} ครั้ง`;
  }

  /* ---------------- Coach ---------------- */
  async function renderCoach(user) {
    const root = $('#staff-content');
    const data = await API.getCoachDashboard();
    const coach = data.trainer;
    if (!coach) {
      root.innerHTML = roleStrip(user, 'บัญชีนี้ยังไม่ผูกกับรหัสเทรนเนอร์') +
        section('error', 'ยังเปิดแดชบอร์ดโค้ชไม่ได้',
          '<p>บัญชีโค้ชต้องมีรหัสเทรนเนอร์ที่ตรงกับรายการเทรนเนอร์ในระบบ</p><p class="small">กรุณาติดต่อผู้ดูแลระบบเพื่อผูกบัญชีกับโปรไฟล์เทรนเนอร์</p>');
      return;
    }

    const appointments = data.appointments || [];
    const clients = data.clients || [];
    const summary = data.summary;

    root.innerHTML = roleStrip(user, `เห็นเฉพาะนัดและลูกค้าของ ${coach.name}`) +
      section('identity', 'ข้อมูลโค้ช', `
        <div class="identity">
          <span class="role-avatar" aria-hidden="true">${esc(coach.initials)}</span>
          <div>
            <h3>${esc(coach.name)}</h3>
            <p class="small">${esc(coach.role)} · ประสบการณ์ ${coach.experience} ปี · คะแนน ${coach.rating}</p>
            <p class="small">ความเชี่ยวชาญ: ${esc((coach.tags || []).join(' · '))}</p>
          </div>
          ${badge('โปรไฟล์เทรนเนอร์')}
        </div>
        <p class="small">บัญชีนี้เห็นข้อมูลเฉพาะที่ผูกกับรหัส ${esc(coach.id)} ไม่เห็นสมาชิกหรือนัดของโค้ชคนอื่น</p>`) +
      `<div id="overview">${stats([
        [summary.today, 'นัดวันนี้'],
        [summary.upcoming, 'นัดที่กำลังจะมาถึง'],
        [summary.requested, 'รอการยืนยัน'],
        [summary.clients, 'ลูกค้าที่เกี่ยวข้อง'],
        [summary.scheduleDays, 'วันให้บริการต่อสัปดาห์']
      ])}</div>` +
      section('appointments', `ตารางนัดของ ${esc(coach.name)}`, `
        <div class="toolbar">
          <div><label for="coach-day">กรองวันที่ (เว้นว่างเพื่อดูทั้งหมด)</label><input id="coach-day" type="date"></div>
          <div><label for="coach-status">สถานะ</label><select id="coach-status">
            <option value="open">เฉพาะที่ยังไม่ยกเลิก</option>
            <option value="upcoming">นัดที่กำลังจะมาถึง</option>
            <option value="cancelled">นัดที่ถูกยกเลิก</option>
            <option value="all">ทั้งหมด</option>
          </select></div>
        </div>
        <div id="coach-appointments"></div>`) +
      section('clients', 'ลูกค้าที่เกี่ยวข้อง', clients.length ? `
        <p class="small">รายชื่อมาจากผู้ที่เลือกแพ็กเกจกับโค้ชหรือมีนัดกับโค้ช</p>
        <label for="client">เลือกลูกค้า</label>
        <select id="client">${clients.map(client => `<option value="${client.id}">${esc(client.name)} · ${esc(client.email)}</option>`).join('')}</select>
        <div id="client-summary"></div>
        <form id="note-form">
          <label for="coach-note">บันทึกติดตามงาน</label>
          <textarea id="coach-note" maxlength="2000" placeholder="เช่น นัดครั้งหน้าทบทวนท่าพื้นฐาน"></textarea>
          <p class="small">บันทึกถูกเก็บในฐานข้อมูลและเห็นเฉพาะโค้ชคนนี้ ไม่ควรใส่ข้อมูลสุขภาพที่ละเอียดอ่อน</p>
          <button type="submit">บันทึกโน้ต</button>
        </form>` : empty('ยังไม่มีลูกค้าที่เลือกโค้ชหรือมีนัดกับโค้ชคนนี้')) +
      section('schedule', 'ตารางให้บริการ', (coach.schedule || []).map(slot =>
        `<div class="row"><strong>${esc(slot)}</strong>${badge('ตารางให้บริการ')}</div>`).join('') +
        '<p class="muted">ความยาวนัด 60 นาที · เวลาก่อนและหลังนัด · เงื่อนไขหักครั้งยังรอสรุปกับทางฟิตเนส</p>');

    const filterAppointments = () => {
      const date = $('#coach-day').value;
      const status = $('#coach-status').value;
      const list = appointments.filter(item => {
        if (date && item.date !== date) return false;
        if (status === 'open') return ['requested', 'confirmed'].includes(item.status);
        if (status === 'upcoming') return item.date >= today() && ['requested', 'confirmed'].includes(item.status);
        if (status === 'cancelled') return item.status === 'cancelled';
        return true;
      });
      $('#coach-appointments').innerHTML = appointmentTable(list);
    };
    $('#coach-day').onchange = $('#coach-status').onchange = filterAppointments;
    filterAppointments();

    if (root._coachHandler) root.removeEventListener('click', root._coachHandler);
    root._coachHandler = async event => {
      const button = event.target.closest('button[data-appt-status]');
      if (!button) return;
      button.disabled = true;
      try {
        await API.setCoachAppointmentStatus(button.dataset.apptId, button.dataset.apptStatus);
        notify('อัปเดตสถานะนัดแล้ว');
        await renderCoach(user);
      } catch (error) {
        notify(error.message, true);
        button.disabled = false;
      }
    };
    root.addEventListener('click', root._coachHandler);

    if (!clients.length) return;
    const loadClient = () => {
      const client = clients.find(item => item.id === $('#client').value) || clients[0];
      $('#client-summary').innerHTML = `
        <p><strong>${esc(client.name)}</strong> <span class="small">${esc(client.email)}</span></p>
        <p class="small">นัดกับโค้ชคนนี้ ${client.appointments} รายการ · นัดล่าสุด ${day(client.lastDate)}</p>`;
      $('#coach-note').value = client.note || '';
    };
    $('#client').onchange = loadClient;
    loadClient();

    $('#note-form').onsubmit = async event => {
      event.preventDefault();
      const client = clients.find(item => item.id === $('#client').value) || clients[0];
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const result = await API.saveCoachNote(client.id, $('#coach-note').value.trim());
        client.note = result.note;
        notify(`บันทึกโน้ตให้ ${client.name} แล้ว (${timeStamp()})`);
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
      }
    };
  }

  async function init() {
    if (!API || !API.getToken() || !API.getCachedUser()) {
      location.replace('login.html');
      return;
    }
    const expectedRole = document.body.dataset.staffRole;
    const user = window.SSFRoles ? window.SSFRoles.requireRole(expectedRole) : API.getCachedUser();
    if (!user) return;

    try {
      if (expectedRole === 'admin') await renderAdmin(user);
      else await renderCoach(user);
    } catch (error) {
      $('#staff-content').innerHTML = `<div class="notice">${esc(error.message || 'โหลดข้อมูลไม่สำเร็จ')}</div>`;
    }
  }

  init();
})();
