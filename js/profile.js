/* หน้าข้อมูลส่วนตัว — อ่านและบันทึกผ่าน /api/me/profile */
(() => {
  'use strict';

  const API = window.SSFAPI;
  const root = document.querySelector('#content');
  if (!API || !API.getToken() || !API.getCachedUser()) {
    location.replace('login.html');
    return;
  }

  let user = API.getCachedUser();

  root.innerHTML = '<section class="card"><h2>ชื่อและข้อมูลติดต่อ</h2><p class="muted">ใช้ระบุตัวสมาชิกและติดต่อเกี่ยวกับบริการหรือนัดหมาย ข้อมูลสุขภาพจัดเก็บแยกในหน้าข้อมูลสุขภาพ</p><form id="profile-form"><div class="profile-grid"><div><label for="profile-first-name">ชื่อ</label><input id="profile-first-name" name="firstName" autocomplete="given-name" maxlength="80" required></div><div><label for="profile-last-name">นามสกุล</label><input id="profile-last-name" name="lastName" autocomplete="family-name" maxlength="100" required></div><div class="wide"><label for="profile-phone">เบอร์ติดต่อ</label><input id="profile-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" aria-describedby="phone-help" required><p id="phone-help" class="field-help">กรอกเบอร์ที่ติดต่อได้ รองรับ + และเว้นวรรค</p></div><div><label for="profile-email">อีเมลเข้าสู่ระบบ</label><input id="profile-email" type="email" readonly aria-describedby="email-help"><p id="email-help" class="field-help">ยังเปลี่ยนอีเมลไม่ได้ ต้องมีขั้นตอนยืนยันอีเมลใหม่ก่อน</p></div><div><label for="profile-student">รหัสนักศึกษา</label><input id="profile-student" readonly aria-describedby="student-help"><p id="student-help" class="field-help">หากต้องแก้รหัสที่ใช้ตรวจสิทธิ์ กรุณาติดต่อเจ้าหน้าที่</p></div></div><div class="save-actions"><button type="submit">บันทึกข้อมูล</button><button id="profile-reset" type="button" class="secondary">คืนค่าที่บันทึกไว้</button></div><p id="profile-message" class="form-message" role="status" aria-live="polite"></p></form></section><section class="card"><h2>ข้อมูลที่ระบบดูแล</h2><p id="profile-id"></p><p class="muted">บทบาท แพ็กเกจ วันหมดอายุ และบัตร RFID ไม่สามารถแก้ไขจากหน้านี้ได้</p><a href="membership.html">ดูแพ็กเกจและสิทธิ์ของฉัน →</a></section>';

  const field = id => document.querySelector('#profile-' + id);
  const message = field('message');

  function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts.shift() || '', lastName: parts.join(' ') };
  }

  function fill(source = user) {
    const parts = splitName(source.fullName || source.name);
    field('first-name').value = parts.firstName;
    field('last-name').value = parts.lastName;
    field('phone').value = source.phone || '';
    field('email').value = source.email || '';
    field('student').value = source.studentId || 'ยังไม่ได้ระบุ';
    field('id').textContent = 'รหัสสมาชิก: ' + (source.id || 'ยังไม่ได้กำหนด');
  }

  field('reset').onclick = () => {
    fill();
    message.className = 'form-message';
    message.textContent = 'คืนค่าที่บันทึกไว้แล้ว';
  };

  document.querySelector('#profile-form').onsubmit = async event => {
    event.preventDefault();
    const firstName = field('first-name').value.trim().replace(/\s+/g, ' ');
    const lastName = field('last-name').value.trim().replace(/\s+/g, ' ');
    const phone = field('phone').value.trim();
    const digits = phone.replace(/\D/g, '');

    message.className = 'form-message error';
    if (!firstName || !lastName || firstName.length > 80 || lastName.length > 100) {
      message.textContent = 'กรุณากรอกชื่อและนามสกุลให้ครบ';
      return;
    }
    if (!/^\+?[0-9 ()-]+$/.test(phone) || digits.length < 8 || digits.length > 15) {
      message.textContent = 'กรุณากรอกเบอร์ติดต่อให้ถูกต้อง (8–15 หลัก)';
      return;
    }

    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const data = await API.updateProfile({ firstName, lastName, phone });
      user = data.user;
      API.cacheUser(data.user);
      fill(data.user);
      message.className = 'form-message';
      message.textContent = 'บันทึกข้อมูลลงฐานข้อมูลแล้ว';
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'บันทึกไม่สำเร็จ';
    } finally {
      button.disabled = false;
    }
  };

  (async () => {
    try {
      const data = await API.getMe();
      user = data.user;
      API.cacheUser(data.user);
      fill(user);
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'โหลดข้อมูลไม่สำเร็จ';
    }
  })();
})();
