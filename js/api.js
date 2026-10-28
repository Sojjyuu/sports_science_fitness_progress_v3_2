/* ชั้นเชื่อมต่อ REST API + เก็บ token/session cache ฝั่งเบราว์เซอร์
   หมายเหตุ: ข้อมูลจริงอยู่ใน PostgreSQL การตรวจสิทธิ์ขั้นสุดท้ายอยู่ที่เซิร์ฟเวอร์ */
(() => {
  'use strict';

  const TOKEN_KEY = 'ssf_token';
  const USER_KEYS = ['sportsScienceCurrentUser', 'ssf_current_user'];
  const HEALTH_KEY = 'sportsScienceHealthProfiles';
  const TRAINER_KEY = 'sportsScienceSelectedTrainer';

  class APIError extends Error {
    constructor(message, status, code) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.code = code;
    }
  }

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function getCachedUser() {
    for (const key of USER_KEYS) {
      const user = readJSON(key, null);
      if (user?.email) return user;
    }
    return null;
  }

  function cacheUser(user) {
    if (!user) return;
    const safe = { ...user };
    delete safe.password;
    const serialized = JSON.stringify(safe);
    USER_KEYS.forEach(key => {
      localStorage.setItem(key, serialized);
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, serialized);
    });
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    USER_KEYS.forEach(key => {
      localStorage.removeItem(key);
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    });
  }

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    if (location.protocol === 'file:') {
      throw new APIError('กรุณาเปิดเว็บผ่านเซิร์ฟเวอร์ (http://localhost:3000) เพื่อเชื่อมต่อฐานข้อมูล', 0, 'FILE_PROTOCOL');
    }
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new APIError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่า Backend ทำงานอยู่', 0, 'NETWORK');
    }

    let data = {};
    try { data = await response.json(); } catch { /* response ว่าง */ }

    if (!response.ok) {
      if (response.status === 401) clearSession();
      throw new APIError(data?.error?.message || 'คำขอไม่สำเร็จ', response.status, data?.error?.code);
    }
    return data;
  }

  function setSession(payload) {
    if (payload?.token) localStorage.setItem(TOKEN_KEY, payload.token);
    if (payload?.user) cacheUser(payload.user);
    return payload?.user || null;
  }

  /* แปลงข้อมูลสุขภาพจาก API ให้ features.js เดิมใช้แนะนำเทรนเนอร์ได้ */
  function cacheHealth(profile, email) {
    if (!profile || !email) return;
    const profiles = readJSON(HEALTH_KEY, {});
    profiles[email] = profile;
    writeJSON(HEALTH_KEY, profiles);
  }

  async function hydrate() {
    const user = getCachedUser();
    if (!getToken() || !user) return null;
    try {
      const { user: fresh } = await request('/auth/me');
      cacheUser(fresh);
      if (fresh.role === 'member') {
        const [meData, healthData] = await Promise.all([
          request('/me').catch(() => null),
          request('/me/health').catch(() => null)
        ]);
        if (meData?.user) cacheUser(meData.user);
        if (healthData?.profile) cacheHealth(healthData.profile, fresh.email);
        if (fresh.selectedTrainerId) {
          try {
            const { trainers } = await request('/trainers', { auth: false });
            const trainer = trainers.find(item => item.id === fresh.selectedTrainerId);
            if (trainer) writeJSON(TRAINER_KEY, trainer);
          } catch { /* cache นี้ไม่จำเป็นต่อการทำงานหลัก */ }
        }
      }
      return fresh;
    } catch {
      return null;
    }
  }

  async function login(email, password) {
    const payload = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    return setSession(payload);
  }

  async function googleLogin(credential) {
    const payload = await request('/auth/google', { method: 'POST', body: { credential }, auth: false });
    return setSession(payload);
  }

  async function googleDemoLogin() {
    const payload = await request('/auth/google/demo', { method: 'POST', body: {}, auth: false });
    return setSession(payload);
  }

  async function register(payload) {
    return request('/auth/register', { method: 'POST', body: payload, auth: false });
  }

  function logout() {
    clearSession();
    location.replace('login.html');
  }

  const api = {
    APIError,
    getToken,
    getCachedUser,
    cacheUser,
    clearSession,
    request,
    login,
    googleLogin,
    googleDemoLogin,
    register,
    logout,
    hydrate,

    authMe: () => request('/auth/me'),
    getCatalog: () => request('/packages', { auth: false }),
    getTrainers: () => request('/trainers', { auth: false }),
    getAvailability: (trainerId, date) => request(`/trainers/${encodeURIComponent(trainerId)}/availability?date=${encodeURIComponent(date)}`),

    getMe: () => request('/me'),
    updateProfile: payload => request('/me/profile', { method: 'PATCH', body: payload }),
    updatePreferences: payload => request('/me/preferences', { method: 'PATCH', body: payload }),
    getAppointments: () => request('/me/appointments'),
    bookAppointment: payload => request('/me/appointments', { method: 'POST', body: payload }),
    rescheduleAppointment: (id, payload) => request(`/me/appointments/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
    cancelAppointment: id => request(`/me/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getHealth: () => request('/me/health'),
    saveHealth: payload => request('/me/health', { method: 'PUT', body: payload }),
    getAccess: () => request('/me/access'),

    getCoachDashboard: () => request('/coach/dashboard'),
    setCoachAppointmentStatus: (id, status) => request(`/coach/appointments/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
    getCoachNote: memberId => request(`/coach/clients/${encodeURIComponent(memberId)}/note`),
    saveCoachNote: (memberId, note) => request(`/coach/clients/${encodeURIComponent(memberId)}/note`, { method: 'PUT', body: { note } }),

    getAdminDashboard: () => request('/admin/dashboard'),
    setAdminAppointmentStatus: (id, status) => request(`/admin/appointments/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
    setMemberStatus: (id, status) => request(`/admin/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
    getEntitlements: status => request(`/admin/entitlements${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    setEntitlementStatus: (id, payload) => request(`/admin/entitlements/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
    getRfidCards: () => request('/admin/rfid-cards'),
    issueRfidCard: payload => request('/admin/rfid-cards', { method: 'POST', body: payload }),
    setRfidStatus: (id, status) => request(`/admin/rfid-cards/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),
    getStaff: () => request('/admin/staff')
  };

  window.SSFAPI = api;
})();
