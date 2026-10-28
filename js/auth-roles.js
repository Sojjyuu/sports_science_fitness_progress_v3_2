/* ตัวช่วยเรื่องบทบาท (member / coach / admin) ฝั่งหน้าจอ
   - session จริงมาจาก API (JWT) ไม่ได้สร้างบัญชีหรือล็อกอินเองในไฟล์นี้
   - การตรวจสิทธิ์ขั้นสุดท้ายอยู่ที่ Backend ทุกคำขอ
   - ข้อมูลบัญชีทดลองใช้เพียงเติมฟอร์มบนหน้า login เท่านั้น */
(() => {
  'use strict';

  const SESSION_KEYS = ['sportsScienceCurrentUser', 'ssf_current_user'];
  const TOKEN_KEY = 'ssf_token';
  const ROLE_LABEL = { admin: 'ผู้ดูแลระบบ', coach: 'โค้ช', member: 'สมาชิก' };

  const ADMIN_ACCOUNT = {
    email: 'admin@sportscience.local',
    password: 'admin1234',
    role: 'admin',
    name: 'ผู้ดูแลระบบ'
  };

  const COACH_ACCOUNTS = [
    ['coach-narin', 'coach.narin'],
    ['coach-pim', 'coach.pim'],
    ['coach-ton', 'coach.ton'],
    ['coach-may', 'coach.may'],
    ['coach-beam', 'coach.beam'],
    ['coach-fah', 'coach.fah']
  ];
  const COACH_PASSWORD = 'coach1234';

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };

  function roleOf(user) {
    return user?.role === 'admin' || user?.role === 'coach' ? user.role : 'member';
  }

  function roleLabel(role) {
    return ROLE_LABEL[roleOf({ role })] || ROLE_LABEL.member;
  }

  function getSession() {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    for (const key of SESSION_KEYS) {
      const value = readJSON(key, null);
      if (value?.email) return value;
    }
    return null;
  }

  function clearSession() {
    if (window.SSFAPI) {
      window.SSFAPI.clearSession();
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    SESSION_KEYS.forEach(key => {
      localStorage.removeItem(key);
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    });
  }

  function staffAccounts() {
    const trainers = window.SSFCatalog?.trainers || [];
    const coaches = COACH_ACCOUNTS.map(([trainerId, localPart]) => {
      const trainer = trainers.find(item => item.id === trainerId);
      return {
        email: `${localPart}@sportscience.local`,
        password: COACH_PASSWORD,
        role: 'coach',
        trainerId,
        name: trainer?.name || localPart
      };
    });
    return [ADMIN_ACCOUNT, ...coaches];
  }

  function dashboardFor(user) {
    const role = roleOf(user);
    if (role === 'admin') return 'admin-dashboard.html';
    if (role === 'coach') return 'coach-dashboard.html';
    return 'dashboard.html';
  }

  function go(url) {
    if (typeof window.location.replace === 'function') window.location.replace(url);
    else window.location.href = url;
  }

  /* ใช้กับหน้าเจ้าหน้าที่: ไม่มี token/role ไม่ตรง → เด้งกลับ */
  function requireRole(expectedRole) {
    const user = getSession();
    if (!user) {
      go('login.html');
      return null;
    }
    if (expectedRole && roleOf(user) !== expectedRole) {
      go(dashboardFor(user));
      return null;
    }
    return user;
  }

  /* เติมบัญชีทดลองบนหน้า login (ไม่ได้ล็อกอินให้) */
  function initDemoAccounts() {
    const box = document.querySelector('[data-demo-accounts]');
    if (!box) return;
    const accounts = staffAccounts();
    box.innerHTML = `
      <label class="demo-label" for="demoAccount">บัญชีทดลองเจ้าหน้าที่</label>
      <div class="demo-row">
        <select id="demoAccount">
          ${accounts.map((account, index) => `<option value="${index}">${roleLabel(account.role)} · ${account.name}</option>`).join('')}
        </select>
        <button type="button" class="demo-fill" id="demoFill">ใช้บัญชีนี้</button>
      </div>
      <p class="demo-note" id="demoHint"></p>`;

    const select = box.querySelector('#demoAccount');
    const fillButton = box.querySelector('#demoFill');
    const hint = box.querySelector('#demoHint');
    const sync = () => {
      const account = accounts[Number(select.value)] || accounts[0];
      hint.textContent = `${account.email} · รหัสผ่าน ${account.password}`;
    };
    sync();
    select.addEventListener('change', sync);
    fillButton.addEventListener('click', () => {
      const account = accounts[Number(select.value)] || accounts[0];
      const emailField = document.getElementById('loginEmail');
      const passwordField = document.getElementById('loginPassword');
      if (emailField) emailField.value = account.email;
      if (passwordField) passwordField.value = account.password;
      hint.textContent = 'กรอกบัญชีให้แล้ว กด “เข้าสู่ระบบ” เพื่อเปิดแดชบอร์ดตามบทบาท';
    });
  }

  document.addEventListener('DOMContentLoaded', initDemoAccounts);

  window.SSFRoles = {
    roleOf,
    roleLabel,
    getSession,
    clearSession,
    dashboardFor,
    requireRole,
    staffAccounts
  };
})();
