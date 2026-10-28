/* หน้าสมาชิก — ดึงข้อมูลจริงจาก REST API (PostgreSQL)
   ทุกการอ่าน/เขียนผ่าน window.SSFAPI ซึ่งแนบ JWT ให้อัตโนมัติ */
(() => {
  'use strict';

  const API = window.SSFAPI;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const root = document.querySelector('#content');
  const page = document.body.dataset.memberPage;

  if (!API || !API.getToken() || !API.getCachedUser()) {
    location.replace('login.html');
    return;
  }

  let user = API.getCachedUser();
  let entitlements = [];

  const catalog = window.SSFCatalog || { trainers: [], fitness: [], trainer: [] };
  const date = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('th-TH') : 'ยังไม่ระบุ';
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const future = item => new Date(`${item.date}T${item.time || '00:00'}`) > new Date();
  const isOpen = item => ['requested', 'confirmed'].includes(item.status);
  const statusLabel = item => ({
    requested: 'รอยืนยันจากโค้ช',
    confirmed: 'ยืนยันแล้ว',
    cancelled: 'ยกเลิกแล้ว',
    completed: 'เสร็จสิ้น',
    no_show: 'ไม่มา'
  }[item.status] || item.status);
  const card = (title, body) => `<section class="card"><h2>${title}</h2>${body}</section>`;
  const empty = message => `<div class="empty">${message}</div>`;
  const link = (url, text) => `<a class="button" href="${url}">${text}</a>`;
  const notice = message => `<div class="notice">${esc(message)}</div>`;

  function showError(error) {
    root.innerHTML = notice(error?.message || 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
  }

  function fitnessEntitlement() {
    return entitlements.find(item => item.kind === 'fitness' && item.active)
      || entitlements.find(item => item.kind === 'fitness' && item.status === 'confirmed')
      || entitlements.find(item => item.kind === 'fitness')
      || null;
  }
  function trainerEntitlement() {
    return entitlements.find(item => item.kind === 'trainer') || null;
  }
  const active = () => !!fitnessEntitlement()?.active;

  const logoutButton = document.querySelector('#logout');
  if (logoutButton) logoutButton.onclick = () => API.logout();
  window.addEventListener('pageshow', () => {
    if (!API.getToken() || !API.getCachedUser()) location.replace('login.html');
  });

  async function loadMe() {
    const data = await API.getMe();
    user = data.user;
    entitlements = data.entitlements || [];
    API.cacheUser(data.user);
    return data;
  }

  async function renderDashboard() {
    const [me, appointmentData, healthData, accessData] = await Promise.all([
      loadMe(),
      API.getAppointments().catch(() => ({ appointments: [] })),
      API.getHealth().catch(() => ({ profile: null })),
      API.getAccess().catch(() => ({ card: null, logs: [] }))
    ]);
    const appointments = appointmentData.appointments || [];
    const profile = healthData.profile;
    const next = appointments.filter(item => isOpen(item) && future(item))
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
    const cardInfo = accessData.card;
    const logCount = (accessData.logs || []).length;

    root.innerHTML = '<div class="cards">' +
      card('สวัสดี ' + esc(me.user.fullName || me.user.name || 'สมาชิก'),
        `<p>${esc(me.user.email)}</p><span class="badge">${active() ? 'มีสิทธิ์เข้าใช้ที่ยืนยันแล้ว' : 'ยังไม่มีสิทธิ์เข้าใช้ที่ยืนยันแล้ว'}</span><div class="links">${link('membership.html', 'ดูสิทธิ์สมาชิก')}</div>`) +
      card('นัดฝึกถัดไป', next
        ? `<p>${esc(next.trainerName || 'เทรนเนอร์')}</p><div class="value">${date(next.date)} ${esc(next.time)}</div><span class="badge">${esc(statusLabel(next))}</span>`
        : empty('ยังไม่มีนัดฝึกที่กำลังจะมาถึง') + `<div class="links">${link('appointments.html', 'จองนัดกับเทรนเนอร์')}</div>`) +
      card('ผลประเมินล่าสุด', profile?.results
        ? `<div class="value">BMI ${esc(profile.results.bmi)}</div><p>อัปเดต ${esc(profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('th-TH') : 'ยังไม่ระบุ')}</p>${link('assessment.html', 'อ่านความหมายของผล')}`
        : empty('ยังไม่ได้กรอกข้อมูลสุขภาพ') + `<div class="links">${link('health-profile.html', 'กรอกข้อมูลสุขภาพ')}</div>`) +
      card('การเข้าใช้สถานที่', cardInfo
        ? `<p>บัตร RFID: ${esc(cardInfo.cardUid)} · ${esc({ pending: 'รอเปิดใช้งาน', active: 'ใช้งานได้', suspended: 'ถูกระงับ' }[cardInfo.status] || cardInfo.status)}</p><p class="muted">ประวัติจากเครื่องอ่าน ${logCount} รายการล่าสุด</p>${link('access.html', 'ดูบัตรและประวัติ')}`
        : empty('ยังไม่มีบัตร RFID ที่ผูกกับบัญชีนี้') + `<div class="links">${link('access.html', 'ดูบัตรและประวัติ')}</div>`) +
      '</div>';
  }

  function renderMembership() {
    const fitness = fitnessEntitlement();
    const trainer = trainerEntitlement();
    const statusText = fitness
      ? ({ pending: 'รอเจ้าหน้าที่ตรวจสอบ', confirmed: fitness.active ? 'สิทธิ์ใช้งานอยู่' : 'ยืนยันแล้วแต่ไม่ใช่วันใช้งาน', cancelled: 'ถูกยกเลิก', expired: 'หมดอายุ' }[fitness.status] || fitness.status)
      : 'ยังไม่มีสิทธิ์ที่ยืนยันแล้ว';

    root.innerHTML =
      card('สิทธิ์เข้าใช้ฟิตเนส',
        `<div class="value">${esc(statusText)}</div>
         <div class="row"><span>แพ็กเกจ</span><strong>${esc(fitness?.packageName || user.fitnessPackageName || 'ยังไม่ได้เลือก')}</strong></div>
         <div class="row"><span>วันเริ่มสิทธิ์</span><strong>${date(fitness?.startDate)}</strong></div>
         <div class="row"><span>วันหมดอายุ</span><strong>${date(fitness?.expireDate)}</strong></div>
         <p class="muted">การสมัครบัญชีหรือเลือกแพ็กเกจยังไม่ใช่การยืนยันสิทธิ์เข้าใช้ กรุณาติดต่อเคาน์เตอร์</p>`) +
      card('แพ็กเกจที่เลือกไว้',
        `<div class="row"><span>ฟิตเนส</span><strong>${esc(user.fitnessPackageName || 'ยังไม่ได้เลือก')}</strong></div>
         <div class="row"><span>ฝึกส่วนตัว</span><strong>${esc(user.trainerPackageName || 'ยังไม่ได้เลือก')}</strong></div>
         <div class="row"><span>โค้ชที่เลือกสำหรับแพ็กเกจ</span><strong>${esc(user.selectedTrainerName || 'ยังไม่ได้เลือก')}</strong></div>
         <div class="row"><span>สิทธิ์ฝึกส่วนตัว</span><strong>${esc(trainer ? ({ pending: 'รอตรวจสอบ', confirmed: 'ยืนยันแล้ว', cancelled: 'ยกเลิก', expired: 'หมดอายุ' }[trainer.status] || trainer.status) : 'ยังไม่มีข้อมูล')}</strong></div>
         <div class="row"><span>ครั้งที่ใช้ / ทั้งหมด</span><strong>${trainer ? `${esc(trainer.sessionsUsed ?? 0)} / ${esc(trainer.sessionsTotal ?? '-')}` : 'ยังไม่มีข้อมูล'}</strong></div>
         <p class="muted">การหักครั้งและการสิ้นสุดสิทธิ์ยังรอสรุปเงื่อนไขกับทางฟิตเนส</p>${link('packages.html', 'เลือกหรือเปลี่ยนแพ็กเกจ')}`);
  }

  function renderAccess() {
    return API.getAccess().then(({ card: cardInfo, logs }) => {
      const statusText = { pending: 'รอเปิดใช้งาน', active: 'ใช้งานได้', suspended: 'ถูกระงับ' };
      const cardBlock = cardInfo
        ? `<div class="value">${esc(cardInfo.cardUid)}</div><span class="badge">${esc(statusText[cardInfo.status] || cardInfo.status)}</span>
           <div class="row"><span>ออกบัตร</span><strong>${date(cardInfo.issuedAt)}</strong></div>
           ${cardInfo.suspendedAt ? `<div class="row"><span>ระงับเมื่อ</span><strong>${date(cardInfo.suspendedAt)}</strong></div>` : ''}`
        : '<span class="badge">ยังไม่มีบัตร</span><p>ยังไม่มีบัตรที่ผูกกับบัญชีนี้</p><p class="muted">รับและผูกบัตรกับเจ้าหน้าที่ ณ เคาน์เตอร์ เมื่อบัตรหายให้แจ้งเจ้าหน้าที่ระงับบัตรและออกบัตรใหม่</p>';
      const history = (logs || []).length
        ? logs.map(item => `<div class="row"><div><strong>${esc(new Date(item.entered_at).toLocaleString('th-TH'))}</strong><br><span class="muted">${esc(item.source)} · ${item.direction === 'in' ? 'เข้า' : 'ออก'} · ${item.allowed ? 'อนุญาต' : 'ไม่อนุญาต'}</span></div></div>`).join('')
        : empty('ยังไม่มีข้อมูลจากเครื่องอ่าน RFID');
      root.innerHTML = card('Keycard · RFID', cardBlock) +
        card('ขั้นตอนเข้าใช้', '<ol><li>ตรวจสอบสิทธิ์สมาชิกและสถานะบัตร</li><li>แตะบัตรกับเครื่องอ่านที่ทางเข้า</li><li>ระบบตรวจสิทธิ์และบันทึกเหตุการณ์จากเครื่องอ่าน</li></ol>') +
        card('ประวัติเข้าใช้', history);
    });
  }

  function renderAssessment() {
    return API.getHealth().then(({ profile }) => {
      root.innerHTML = card('ผลของคุณ',
        profile?.results
          ? '<div class="cards">' + Object.entries({
            BMI: profile.results.bmi,
            'BMR (kcal/วัน)': profile.results.bmr,
            'TDEE (kcal/วัน)': profile.results.tdee,
            'พลังงานเป้าหมาย (kcal/วัน)': profile.results.targetCalories,
            'โปรตีน (g/วัน)': profile.results.protein
          }).map(([key, value]) => `<div><span class="muted">${esc(key)}</span><div class="value">${esc(value)}</div></div>`).join('') + '</div>'
          : empty('ยังไม่มีผลประเมิน') + `<div class="links">${link('health-profile.html', 'กรอกข้อมูลสุขภาพ')}</div>`) +
        card('สัญลักษณ์และสูตรที่ระบบใช้',
          '<details open><summary>i · BMI — ดัชนีมวลกาย</summary><p>น้ำหนัก (kg) ÷ ส่วนสูง (m)² ใช้คัดกรองเบื้องต้น ไม่ใช่การวัดไขมันหรือวินิจฉัยโรคโดยตรง</p><p>รุ่นเดิมแสดงช่วงตัด 18.5, 23, 25 และ 30 ซึ่งต่างจากเกณฑ์ CDC ผู้ใหญ่ หน้านี้จึงไม่ยืนยันชื่อกลุ่มจากช่วงตัดดังกล่าวจนกว่าจะเลือกแหล่งอ้างอิงประชากรให้ชัดเจน</p></details>' +
          '<details><summary>≈ · BMR และ TDEE — ค่าประมาณพลังงาน</summary><p>BMR ในโค้ดเดิมใช้สมการ Mifflin–St Jeor: 10 × น้ำหนัก (kg) + 6.25 × ส่วนสูง (cm) − 5 × อายุ + 5 สำหรับชาย หรือ −161 สำหรับหญิง ส่วน TDEE = BMR × ตัวคูณกิจกรรมที่เลือก ค่าไม่ได้มาจากการวัดการเผาผลาญจริง</p></details>' +
          '<details><summary>! · พลังงานเป้าหมายและโปรตีน</summary><p>โค้ดเดิมลด 400 kcal สำหรับเป้าหมายลดน้ำหนัก หรือเพิ่ม 250 kcal สำหรับเพิ่มกล้ามเนื้อ และตั้งขั้นต่ำ 1,200 kcal โปรตีนใช้ 1.8 g/kg เมื่อเพิ่มกล้ามเนื้อ และ 1.5 g/kg สำหรับเป้าหมายอื่น ตัวเลขเหล่านี้เป็นกติกาของต้นแบบ ยังไม่ใช่คำแนะนำเฉพาะบุคคลที่ผ่านการยืนยัน</p></details>') +
        card('แหล่งอ้างอิงและข้อจำกัด',
          '<ul><li><a href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html">CDC — Adult BMI Categories</a>: ความหมายและข้อจำกัดของ BMI สำหรับผู้ใหญ่อายุ 20 ปีขึ้นไป</li><li><a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner">NIDDK — Body Weight Planner</a>: ข้อมูลเรื่องการวางแผนพลังงานและน้ำหนัก (ไม่ใช่สูตรที่ต้นแบบนี้นำมาใช้)</li></ul><p>ตัวคูณกิจกรรม การปรับพลังงาน โปรตีน และเกณฑ์ BMI ของรุ่นเดิมต้องทบทวนแหล่งอ้างอิงเพิ่มเติมก่อนใช้เป็นคำแนะนำจริง</p>');
    });
  }

  let editing = null;
  let trainers = [];

  async function renderAppointments() {
    const [appointmentData, trainerData] = await Promise.all([
      API.getAppointments(),
      API.getTrainers().catch(() => ({ trainers: catalog.trainers || [] }))
    ]);
    trainers = trainerData.trainers || [];
    let appointments = appointmentData.appointments || [];

    root.innerHTML = card('จองนัดฝึก',
      `<p class="muted">ระยะเวลา 60 นาที คำขอจะส่งถึงโค้ชและรอการยืนยัน สิทธิ์ฝึกจะยังไม่ถูกหักจนกว่าเงื่อนไขการหักครั้งจะสรุป</p>
       <form id="appointmentForm">
         <label for="coach">เทรนเนอร์</label>
         <select id="coach" required>${trainers.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select>
         <label for="day">วันที่</label>
         <input id="day" type="date" min="${today()}" required>
         <label for="slot">เวลาว่างตามตารางของโค้ช</label>
         <select id="slot" required><option value="">เลือกวันที่ก่อน</option></select>
         <p id="schedule" class="muted"></p>
         <button type="submit">ส่งคำขอนัด</button>
         <button type="button" class="secondary" id="resetEdit">ล้างการเลือก</button>
         <p id="message" role="status" aria-live="polite"></p>
       </form>`) +
      card('นัดหมายของฉัน', '<div id="appointments"></div>');

    const coach = document.querySelector('#coach');
    const day = document.querySelector('#day');
    const slot = document.querySelector('#slot');
    const message = document.querySelector('#message');
    if (user.selectedTrainerId && trainers.some(item => item.id === user.selectedTrainerId)) {
      coach.value = user.selectedTrainerId;
    }

    const refresh = async () => {
      const trainer = trainers.find(item => item.id === coach.value);
      document.querySelector('#schedule').textContent = trainer
        ? 'ตารางให้บริการ: ' + (trainer.schedule || []).join(' / ')
        : '';
      if (!day.value) {
        slot.innerHTML = '<option value="">เลือกวันที่ก่อน</option>';
        return;
      }
      slot.innerHTML = '<option value="">กำลังโหลด...</option>';
      try {
        const data = await API.getAvailability(coach.value, day.value);
        const slots = data.slots || [];
        /* เวลาของนัดเดิมยังถูกนับว่าจองอยู่ จึงเติมกลับให้เลือกเก็บไว้ได้ */
        if (editing && day.value === editing.date && coach.value === editing.trainerId && !slots.includes(editing.time)) {
          slots.push(editing.time);
          slots.sort();
        }
        slot.innerHTML = `<option value="">${slots.length ? 'เลือกเวลา' : 'ไม่มีเวลาว่างในวันที่เลือก'}</option>` +
          slots.map(time => `<option>${esc(time)}</option>`).join('');
      } catch (error) {
        slot.innerHTML = '<option value="">โหลดเวลาไม่สำเร็จ</option>';
        message.textContent = error.message;
      }
    };

    coach.onchange = () => refresh();
    day.onchange = () => refresh();
    if (day.value) await refresh();

    const list = () => {
      document.querySelector('#appointments').innerHTML = appointments
        .slice().sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .map(item => `<div class="row">
          <div><strong>${esc(item.trainerName || 'เทรนเนอร์')}</strong><br>${date(item.date)} ${esc(item.time)} · ${esc(statusLabel(item))}</div>
          ${isOpen(item) && future(item)
            ? `<div><button class="secondary" data-edit="${item.id}">เลื่อนนัด</button> <button class="secondary" data-cancel="${item.id}">ยกเลิก</button></div>`
            : ''}
        </div>`).join('') || empty('ยังไม่มีนัดหมาย');
    };

    document.querySelector('#resetEdit').onclick = () => {
      editing = null;
      day.value = '';
      slot.innerHTML = '<option value="">เลือกวันที่ก่อน</option>';
      message.textContent = 'ล้างการเลือกแล้ว';
    };

    document.querySelector('#appointmentForm').onsubmit = async event => {
      event.preventDefault();
      if (!slot.value || !day.value) {
        message.textContent = 'กรุณาเลือกวันและเวลา';
        return;
      }
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        if (editing) {
          await API.rescheduleAppointment(editing.id, { date: day.value, time: slot.value });
          message.textContent = 'เลื่อนนัดแล้ว รอการยืนยันจากโค้ช';
        } else {
          await API.bookAppointment({ trainerId: coach.value, date: day.value, time: slot.value });
          message.textContent = 'ส่งคำขอนัดแล้ว รอการยืนยันจากโค้ช';
        }
        editing = null;
        appointments = (await API.getAppointments()).appointments || [];
        list();
        await refresh();
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };

    document.querySelector('#appointments').onclick = async event => {
      const button = event.target.closest('button');
      if (!button) return;
      const id = button.dataset.edit || button.dataset.cancel;
      const item = appointments.find(row => row.id === id);
      if (!item) return;

      if (button.dataset.edit) {
        editing = item;
        coach.value = item.trainerId;
        day.value = item.date;
        await refresh();
        slot.value = item.time;
        message.textContent = 'กำลังแก้ไขนัดเดิม เลือกวันเวลาแล้วกดส่งคำขอ';
        day.focus();
        return;
      }

      if (!confirm('ต้องการยกเลิกนัดนี้ใช่หรือไม่?')) return;
      try {
        await API.cancelAppointment(id);
        appointments = (await API.getAppointments()).appointments || [];
        if (editing?.id === id) editing = null;
        list();
        await refresh();
        message.textContent = 'ยกเลิกนัดแล้ว';
      } catch (error) {
        message.textContent = error.message;
      }
    };

    list();
  }

  (async () => {
    try {
      if (page === 'dashboard') return await renderDashboard();
      if (page === 'membership') { await loadMe(); return renderMembership(); }
      if (page === 'access') { await loadMe(); return await renderAccess(); }
      if (page === 'assessment') { return await renderAssessment(); }
      if (page === 'appointments') { await loadMe(); return await renderAppointments(); }
    } catch (error) {
      showError(error);
    }
  })();
})();
