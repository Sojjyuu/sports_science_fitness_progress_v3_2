/* ทดสอบ API แบบ end-to-end (ต้องรันเซิร์ฟเวอร์และ seed ก่อน)
   ใช้: npm test */
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const email = `test.member.${Date.now()}@sportscience.local`;
const results = [];

function check(name, condition, detail = '') {
  results.push({ name, ok: !!condition, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${condition ? '' : ` — ${detail}`}`);
}

async function api(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${BASE}/api${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function nextWorkday() {
  const allowed = [1, 2, 4, 6]; // จ. อ. พฤ. ส. ตามตารางของโค้ชนรินทร์
  const date = new Date();
  for (let i = 1; i <= 14; i += 1) {
    date.setDate(date.getDate() + 1);
    if (allowed.includes(date.getDay())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
  throw new Error('ไม่พบวันทดสอบ');
}

(async () => {
  let memberToken = null;
  const admin = await api('/auth/login', { method: 'POST', body: { email: 'admin@sportscience.local', password: 'admin1234' } });
  check('admin login', admin.status === 200 && admin.data.user?.role === 'admin', JSON.stringify(admin.data));
  const adminToken = admin.data.token;

  const coach = await api('/auth/login', { method: 'POST', body: { email: 'coach.narin@sportscience.local', password: 'coach1234' } });
  check('coach login + trainer profile', coach.status === 200 && coach.data.user?.trainer?.id === 'coach-narin', JSON.stringify(coach.data));
  const coachToken = coach.data.token;

  const otherCoach = await api('/auth/login', { method: 'POST', body: { email: 'coach.pim@sportscience.local', password: 'coach1234' } });
  const otherCoachToken = otherCoach.data.token;

  const badLogin = await api('/auth/login', { method: 'POST', body: { email: 'admin@sportscience.local', password: 'wrong' } });
  check('wrong password rejected', badLogin.status === 401, String(badLogin.status));

  const health = await api('/health');
  check('health check', health.status === 200 && health.data.database === 'up');

  const googleDemo = await api('/auth/google/demo', { method: 'POST', body: {} });
  check('google demo login issues real session token', googleDemo.status === 200 && !!googleDemo.data.token && googleDemo.data.user?.role === 'member', JSON.stringify(googleDemo.data));
  const googleMe = await api('/auth/me', { token: googleDemo.data.token });
  check('google demo session can open member pages', googleMe.status === 200 && googleMe.data.user?.email === 'google.demo@sportscience.local', JSON.stringify(googleMe.data));

  const catalog = await api('/packages');
  check('packages seeded', catalog.data.fitness?.length === 4 && catalog.data.trainer?.length === 3);

  const trainers = await api('/trainers');
  check('trainers seeded', trainers.data.trainers?.length === 6);

  const registered = await api('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'สมาชิก ทดสอบระบบ',
      email,
      password: 'test1234',
      studentId: 'TEST-0001',
      phone: '0812345678',
      serviceType: 'fitness',
      plan: '3m',
      selectedTrainerId: 'coach-narin'
    }
  });
  check('register member', registered.status === 201 && registered.data.user?.role === 'member', JSON.stringify(registered.data));

  const duplicate = await api('/auth/register', {
    method: 'POST',
    body: { fullName: 'ซ้ำ', email, password: 'test1234', phone: '0812345678' }
  });
  check('duplicate email rejected', duplicate.status === 409, String(duplicate.status));

  const login = await api('/auth/login', { method: 'POST', body: { email, password: 'test1234' } });
  check('member login', login.status === 200 && login.data.user?.email === email, JSON.stringify(login.data));
  memberToken = login.data.token;

  let me = await api('/me', { token: memberToken });
  check('member has pending fitness entitlement', me.status === 200 && me.data.entitlements.some(item => item.kind === 'fitness' && item.status === 'pending'), JSON.stringify(me.data));

  const profile = await api('/me/profile', { method: 'PATCH', token: memberToken, body: { firstName: 'สมาชิกใหม่', lastName: 'นามสกุลทดสอบ', phone: '0899999999' } });
  check('update profile', profile.status === 200 && profile.data.user.fullName === 'สมาชิกใหม่ นามสกุลทดสอบ', JSON.stringify(profile.data));

  const healthSaved = await api('/me/health', {
    method: 'PUT',
    token: memberToken,
    body: { age: 25, sex: 'male', height: 175, weight: 70, bodyFat: 18, activity: 1.55, experienceLevel: 'beginner', goal: 'muscle-gain', limitations: 'ไม่มี' }
  });
  check('save health profile + server calculation', healthSaved.status === 200 && healthSaved.data.profile?.results?.bmi > 0 && healthSaved.data.profile?.results?.bmr > 0, JSON.stringify(healthSaved.data));

  const preferences = await api('/me/preferences', { method: 'PATCH', token: memberToken, body: { selectedTrainerId: 'coach-narin', trainerPackageId: 'pt4' } });
  check('update preferences + trainer entitlement', preferences.status === 200 && preferences.data.user.selectedTrainerId === 'coach-narin' && preferences.data.entitlements.some(item => item.kind === 'trainer'), JSON.stringify(preferences.data));

  const date = nextWorkday();
  const availability = await api(`/trainers/coach-narin/availability?date=${date}`);
  check('availability has slots', availability.status === 200 && availability.data.slots.length > 0, JSON.stringify(availability.data));
  const time = availability.data.slots[0];

  const booked = await api('/me/appointments', { method: 'POST', token: memberToken, body: { trainerId: 'coach-narin', date, time } });
  check('book appointment', booked.status === 201 && booked.data.appointment?.status === 'requested', JSON.stringify(booked.data));
  const appointmentId = booked.data.appointment?.id;

  const doubleBook = await api('/me/appointments', { method: 'POST', token: memberToken, body: { trainerId: 'coach-narin', date, time } });
  check('double booking rejected', doubleBook.status === 409 || doubleBook.status === 400, String(doubleBook.status));

  const coachDashboard = await api('/coach/dashboard', { token: coachToken });
  check('coach sees own appointment only', coachDashboard.status === 200 && coachDashboard.data.appointments.some(item => item.id === appointmentId) && coachDashboard.data.trainer.id === 'coach-narin', JSON.stringify(coachDashboard.data.summary));

  const otherCoachDashboard = await api('/coach/dashboard', { token: otherCoachToken });
  check('other coach cannot see appointment', otherCoachDashboard.status === 200 && !otherCoachDashboard.data.appointments.some(item => item.id === appointmentId));

  const confirm = await api(`/coach/appointments/${appointmentId}`, { method: 'PATCH', token: coachToken, body: { status: 'confirmed' } });
  check('coach confirms appointment', confirm.status === 200 && confirm.data.appointment.status === 'confirmed', JSON.stringify(confirm.data));

  const coachNote = await api(`/coach/clients/${me.data.user.id}/note`, { method: 'PUT', token: coachToken, body: { note: 'ทดสอบบันทึกจากโค้ช' } });
  check('coach saves note', coachNote.status === 200 && coachNote.data.note === 'ทดสอบบันทึกจากโค้ช', JSON.stringify(coachNote.data));

  const memberAppointments = await api('/me/appointments', { token: memberToken });
  check('member sees confirmed appointment', memberAppointments.data.appointments?.some(item => item.id === appointmentId && item.status === 'confirmed'));

  const adminDashboard = await api('/admin/dashboard', { token: adminToken });
  check('admin dashboard sees member + appointment', adminDashboard.status === 200
    && adminDashboard.data.members.some(item => item.email === email)
    && adminDashboard.data.appointments.some(item => item.id === appointmentId), JSON.stringify(adminDashboard.data.summary));

  const pending = adminDashboard.data.entitlements.find(item => item.memberEmail === email && item.kind === 'fitness');
  const confirmedEntitlement = await api(`/admin/entitlements/${pending.id}`, { method: 'PATCH', token: adminToken, body: { status: 'confirmed' } });
  check('admin confirms entitlement', confirmedEntitlement.status === 200 && confirmedEntitlement.data.entitlement.status === 'confirmed' && confirmedEntitlement.data.entitlement.active === true, JSON.stringify(confirmedEntitlement.data));

  me = await api('/me', { token: memberToken });
  check('member entitlement active', me.data.entitlements.some(item => item.kind === 'fitness' && item.active === true));

  const accessBefore = await api('/me/access', { token: memberToken });
  check('member access without card', accessBefore.status === 200 && accessBefore.data.card === null);

  const card = await api('/admin/rfid-cards', { method: 'POST', token: adminToken, body: { memberId: me.data.user.id, cardUid: `TEST-${Date.now()}` } });
  check('admin issues rfid card', card.status === 201 && card.data.card?.status === 'pending', JSON.stringify(card.data));

  const accessAfter = await api('/me/access', { token: memberToken });
  check('member sees issued card', accessAfter.status === 200 && accessAfter.data.card?.status === 'pending');

  const forbiddenAdmin = await api('/admin/dashboard', { token: memberToken });
  check('member blocked from admin api', forbiddenAdmin.status === 403, String(forbiddenAdmin.status));

  const forbiddenMember = await api('/me', { token: adminToken });
  check('admin blocked from member api', forbiddenMember.status === 403, String(forbiddenMember.status));

  const anonymous = await api('/admin/dashboard');
  check('anonymous blocked', anonymous.status === 401, String(anonymous.status));

  const invalidBooking = await api('/me/appointments', { method: 'POST', token: memberToken, body: { trainerId: 'coach-narin', date: '2020-01-01', time: '10:00' } });
  check('past booking rejected', invalidBooking.status === 400, String(invalidBooking.status));

  const failed = results.filter(item => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
})().catch(error => {
  console.error('TEST ERROR:', error);
  process.exitCode = 1;
}).finally(async () => {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  });
  try {
    await client.connect();
    await client.query('DELETE FROM accounts WHERE email = $1', [email]);
    console.log('ลบข้อมูลทดสอบแล้ว');
  } catch (error) {
    console.error('cleanup error:', error.message);
  } finally {
    await client.end().catch(() => {});
  }
});
