/* Sports Science Fitness Club - shared front-end logic */
(() => {
  const STORAGE = {
    members: 'ssf_members',
    currentUser: 'ssf_current_user',
    bookings: 'ssf_bookings',
    checkins: 'ssf_checkins'
  };

  const legacyKeys = {
    member: 'sportsScienceMember',
    currentUser: 'sportsScienceCurrentUser'
  };

  const PACKAGES = {
    '1m': { id: '1m', label: '1 เดือน', price: 300, months: 1, featured: false },
    '3m': { id: '3m', label: '3 เดือน', price: 750, months: 3, featured: true },
    '6m': { id: '6m', label: '6 เดือน', price: 1400, months: 6, featured: false },
    '1y': { id: '1y', label: '1 ปี', price: 2500, months: 12, featured: false }
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const currency = (amount) => new Intl.NumberFormat('th-TH').format(amount) + ' ฿';
  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso + 'T00:00:00'));
  };
  const parseJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const addMonths = (date, months) => {
    const copy = new Date(date);
    copy.setMonth(copy.getMonth() + months);
    return copy;
  };
  const daysBetween = (start, end) => Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  function getMembers() { return parseJSON(STORAGE.members, []); }
  function saveMembers(members) { saveJSON(STORAGE.members, members); }
  function getCurrentUser() { return parseJSON(STORAGE.currentUser, null); }
  function setCurrentUser(user) { saveJSON(STORAGE.currentUser, user); }
  function logout() { localStorage.removeItem(legacyKeys.currentUser); localStorage.removeItem(STORAGE.currentUser); window.location.href = 'login.html'; }

  function migrateLegacyData() {
    const members = getMembers();
    const legacyMember = parseJSON(legacyKeys.member, null);
    const legacyCurrent = parseJSON(legacyKeys.currentUser, null);
    const candidate = legacyCurrent || legacyMember;
    if (candidate && candidate.email && !members.some(m => m.email === candidate.email)) {
      const planId = candidate.planId || candidate.plan || '1m';
      const createdAt = candidate.createdAt || todayISO();
      const startDate = candidate.startDate || createdAt;
      const expireDate = candidate.expireDate || candidate.endDate || addMonths(new Date(startDate + 'T00:00:00'), PACKAGES[planId]?.months || 1).toISOString().slice(0, 10);
      members.push({
        id: candidate.id || 'SSF-' + Date.now().toString().slice(-6),
        fullName: candidate.fullName || candidate.name || 'สมาชิก',
        studentId: candidate.studentId || candidate.memberId || '',
        email: candidate.email,
        phone: candidate.phone || '',
        password: candidate.password || '123456',
        planId,
        startDate,
        expireDate,
        createdAt
      });
      saveMembers(members);
    }
    if (legacyCurrent && legacyCurrent.email && !getCurrentUser()) {
      const match = getMembers().find(m => m.email === legacyCurrent.email);
      if (match) setCurrentUser({ ...match, loggedInAt: new Date().toISOString() });
    }
  }

  function showAlert(target, message, type = 'info') {
    const el = typeof target === 'string' ? qs(target) : target;
    if (!el) return;
    el.className = `alert ${type} show`;
    el.textContent = message;
  }

  function clearAlert(target) {
    const el = typeof target === 'string' ? qs(target) : target;
    if (!el) return;
    el.className = 'alert';
    el.textContent = '';
  }

  function initMenu() {
    const hamburger = qs('.hamburger');
    if (!hamburger) return;
    hamburger.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    qsa('a[href]').forEach(link => link.addEventListener('click', () => document.body.classList.remove('menu-open')));
  }

  function initReveal() {
    const items = qsa('.reveal');
    if (!items.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.15 });
    items.forEach(item => observer.observe(item));
  }

  function initNewsletter() {
    const form = qs('.newsletter');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = qs('input', form);
      if (!input.value.trim()) return;
      alert('ขอบคุณสำหรับการติดตามข่าวสาร');
      input.value = '';
    });
  }

  function initLogoutButtons() {
    qsa('[data-action="logout"]').forEach(btn => btn.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    }));
  }

  function updateHeaderAuthState() {
    const actions = qs('[data-auth-actions]');
    if (!actions) return;
    const user = getCurrentUser();
    if (user) {
      actions.innerHTML = `
        <a class="btn" href="dashboard.html">แดชบอร์ด</a>
        <button class="btn btn-primary" type="button" data-action="logout">ออกจากระบบ</button>
      `;
      initLogoutButtons();
    }
  }

  function initPlanLinks() {
    qsa('[data-plan-link]').forEach(link => {
      const planId = link.dataset.planLink;
      const plan = PACKAGES[planId];
      if (!plan) return;
      const priceEl = qs('[data-plan-price]', link.closest('.plan-card'));
      if (priceEl) priceEl.textContent = currency(plan.price);
      link.href = `register.html?plan=${planId}`;
    });
  }

  function initRegisterPage() {
    const form = qs('[data-register-form]');
    if (!form) return;
    const planSelect = qs('[name="planId"]', form);
    if (planSelect) {
      planSelect.innerHTML = Object.values(PACKAGES).map(pkg => `<option value="${pkg.id}">${pkg.label} - ${currency(pkg.price)}</option>`).join('');
      const queryPlan = new URLSearchParams(window.location.search).get('plan');
      if (PACKAGES[queryPlan]) planSelect.value = queryPlan;
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearAlert('#registerAlert');
      const data = Object.fromEntries(new FormData(form).entries());
      data.email = (data.email || '').trim().toLowerCase();
      const members = getMembers();
      if (!data.fullName?.trim() || !data.studentId?.trim() || !data.email || !data.phone?.trim() || !data.password || !data.confirmPassword || !data.planId) {
        return showAlert('#registerAlert', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
      }
      if (!/^\S+@\S+\.\S+$/.test(data.email)) return showAlert('#registerAlert', 'รูปแบบอีเมลไม่ถูกต้อง', 'error');
      if (data.password.length < 6) return showAlert('#registerAlert', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      if (data.password !== data.confirmPassword) return showAlert('#registerAlert', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      if (members.some(member => member.email === data.email)) return showAlert('#registerAlert', 'อีเมลนี้ถูกสมัครสมาชิกไว้แล้ว', 'error');
      const pkg = PACKAGES[data.planId] || PACKAGES['1m'];
      const startDate = todayISO();
      const expireDate = addMonths(new Date(startDate + 'T00:00:00'), pkg.months).toISOString().slice(0, 10);
      const member = {
        id: 'SSF-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        fullName: data.fullName.trim(),
        studentId: data.studentId.trim(),
        email: data.email,
        phone: data.phone.trim(),
        password: data.password,
        planId: data.planId,
        startDate,
        expireDate,
        createdAt: new Date().toISOString()
      };
      members.push(member);
      saveMembers(members);
      showAlert('#registerAlert', 'สมัครสมาชิกสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...', 'success');
      setTimeout(() => window.location.href = 'login.html', 900);
    });
  }

  function initLoginPage() {
    const form = qs('[data-login-form]');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearAlert('#loginAlert');
      const data = Object.fromEntries(new FormData(form).entries());
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';
      if (!email || !password) return showAlert('#loginAlert', 'กรุณากรอกอีเมลและรหัสผ่าน', 'error');
      const member = getMembers().find(m => m.email === email && m.password === password);
      if (!member) return showAlert('#loginAlert', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
      setCurrentUser({ ...member, loggedInAt: new Date().toISOString() });
      showAlert('#loginAlert', 'เข้าสู่ระบบสำเร็จ กำลังเปิดแดชบอร์ด...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 650);
    });
  }

  function requireLogin() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  }

  function getBookings() { return parseJSON(STORAGE.bookings, []); }
  function saveBookings(bookings) { saveJSON(STORAGE.bookings, bookings); }
  function getCheckins() { return parseJSON(STORAGE.checkins, {}); }
  function saveCheckins(checkins) { saveJSON(STORAGE.checkins, checkins); }

  function renderDashboard() {
    const root = qs('[data-dashboard]');
    if (!root) return;
    const user = requireLogin();
    if (!user) return;
    const pkg = PACKAGES[user.planId] || PACKAGES['1m'];
    const now = new Date(todayISO() + 'T00:00:00');
    const start = new Date(user.startDate + 'T00:00:00');
    const end = new Date(user.expireDate + 'T00:00:00');
    const totalDays = Math.max(daysBetween(start, end), 1);
    const remainDays = Math.max(daysBetween(now, end), 0);
    const usedPercent = Math.min(100, Math.max(0, ((totalDays - remainDays) / totalDays) * 100));

    qsa('[data-user-name]').forEach(el => el.textContent = user.fullName || 'สมาชิก');
    qsa('[data-user-email]').forEach(el => el.textContent = user.email || '-');
    qsa('[data-user-id]').forEach(el => el.textContent = user.id || '-');
    qsa('[data-user-student]').forEach(el => el.textContent = user.studentId || '-');
    qsa('[data-user-phone]').forEach(el => el.textContent = user.phone || '-');
    qsa('[data-user-initial]').forEach(el => el.textContent = (user.fullName || 'S').trim()[0].toUpperCase());
    qsa('[data-plan-label]').forEach(el => el.textContent = pkg.label);
    qsa('[data-plan-price]').forEach(el => el.textContent = currency(pkg.price));
    qsa('[data-start-date]').forEach(el => el.textContent = formatDate(user.startDate));
    qsa('[data-expire-date]').forEach(el => el.textContent = formatDate(user.expireDate));
    qsa('[data-remain-days]').forEach(el => el.textContent = remainDays + ' วัน');
    const progress = qs('[data-plan-progress]');
    if (progress) progress.style.width = usedPercent + '%';

    const bookingDate = qs('[name="bookingDate"]');
    if (bookingDate) bookingDate.min = todayISO();
    renderBookingList(user.email);
    renderCheckinStatus(user.email);
  }

  function renderBookingList(email) {
    const list = qs('[data-booking-list]');
    if (!list) return;
    const bookings = getBookings().filter(item => item.email === email).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (!bookings.length) {
      list.innerHTML = '<div class="empty-state">ยังไม่มีประวัติการจอง</div>';
      return;
    }
    list.innerHTML = bookings.slice(0, 8).map(item => `
      <div class="booking-item">
        <div>
          <strong>${item.service}</strong>
          <span>${formatDate(item.date)} เวลา ${item.time}</span>
        </div>
        <span class="badge waiting">${item.status || 'รอตรวจสอบ'}</span>
      </div>
    `).join('');
  }

  function renderCheckinStatus(email) {
    const target = qs('[data-checkin-status]');
    if (!target) return;
    const checkins = getCheckins();
    const dates = checkins[email] || [];
    const checkedToday = dates.includes(todayISO());
    target.textContent = checkedToday ? 'บันทึกการเข้าใช้วันนี้แล้ว' : 'ยังไม่ได้บันทึกการเข้าใช้วันนี้';
    target.className = checkedToday ? 'badge' : 'badge waiting';
  }

  function initDashboardActions() {
    const bookingForm = qs('[data-booking-form]');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const user = requireLogin();
        if (!user) return;
        clearAlert('#bookingAlert');
        const data = Object.fromEntries(new FormData(bookingForm).entries());
        if (!data.bookingDate || !data.bookingTime || !data.service) return showAlert('#bookingAlert', 'กรุณาเลือกวัน เวลา และประเภทบริการ', 'error');
        if (data.bookingDate < todayISO()) return showAlert('#bookingAlert', 'ไม่สามารถจองวันย้อนหลังได้', 'error');
        const bookings = getBookings();
        bookings.push({
          id: 'BK-' + Date.now(),
          email: user.email,
          date: data.bookingDate,
          time: data.bookingTime,
          service: data.service,
          status: 'รอตรวจสอบ',
          createdAt: new Date().toISOString()
        });
        saveBookings(bookings);
        bookingForm.reset();
        const dateField = qs('[name="bookingDate"]', bookingForm);
        if (dateField) dateField.min = todayISO();
        showAlert('#bookingAlert', 'ส่งคำขอจองแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบ', 'success');
        renderBookingList(user.email);
      });
    }

    const checkinBtn = qs('[data-action="checkin"]');
    if (checkinBtn) {
      checkinBtn.addEventListener('click', () => {
        const user = requireLogin();
        if (!user) return;
        const checkins = getCheckins();
        const list = checkins[user.email] || [];
        if (!list.includes(todayISO())) list.push(todayISO());
        checkins[user.email] = list;
        saveCheckins(checkins);
        renderCheckinStatus(user.email);
        showAlert('#dashboardAlert', 'บันทึกการเข้าใช้วันนี้เรียบร้อย', 'success');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    migrateLegacyData();
    initMenu();
    initReveal();
    initNewsletter();
    updateHeaderAuthState();
    initLogoutButtons();
    initPlanLinks();
    initRegisterPage();
    initLoginPage();
    renderDashboard();
    initDashboardActions();
  });
})();
