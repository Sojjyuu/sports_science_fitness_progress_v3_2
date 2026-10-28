class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asyncRoute = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const nowTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

/* บวกเดือนโดยไม่ล้นไปเดือนถัดไป เช่น 2026-01-31 + 1 เดือน = 2026-02-28 */
const addMonths = (dateString, months) => {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
};

const isDateString = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const isTimeString = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
const text = value => String(value ?? '').trim();

const mapUser = row => ({
  id: row.id,
  email: row.email,
  role: row.role,
  fullName: row.full_name,
  name: row.full_name,
  studentId: row.student_id || '',
  phone: row.phone || '',
  status: row.status,
  selectedTrainerId: row.selected_trainer_id || null,
  fitnessPackageId: row.fitness_package_id || null,
  trainerPackageId: row.trainer_package_id || null,
  createdAt: row.created_at
});

const mapTrainer = row => ({
  id: row.id,
  name: row.name,
  initials: row.initials,
  gender: row.gender,
  role: row.title,
  experience: row.experience,
  rating: Number(row.rating),
  specialties: row.specialties || [],
  goals: row.goals || [],
  tags: row.tags || [],
  bio: row.bio || '',
  certifications: row.certifications || [],
  schedule: row.schedule || [],
  color: row.color || ''
});

const mapAppointment = row => ({
  id: row.id,
  memberId: row.member_id,
  memberName: row.member_name || null,
  memberEmail: row.member_email || null,
  trainerId: row.trainer_id,
  trainerName: row.trainer_name || null,
  date: row.date,
  time: String(row.time || '').slice(0, 5),
  status: row.status,
  cancelReason: row.cancel_reason || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const isEntitlementActive = row => {
  if (!row) return false;
  if (row.status !== 'confirmed') return false;
  const today = todayISO();
  return (!row.start_date || row.start_date <= today) && (!row.expire_date || row.expire_date >= today);
};

const mapEntitlement = row => ({
  id: row.id,
  kind: row.kind,
  packageId: row.package_id,
  packageName: row.package_name || null,
  status: row.status,
  startDate: row.start_date,
  expireDate: row.expire_date,
  sessionsTotal: row.sessions_total,
  sessionsUsed: row.sessions_used,
  active: isEntitlementActive(row)
});

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/* อ่านตารางแบบ "จ. 16:00–20:00" แล้วคืนช่วงเวลาเป็นนาที */
const parseScheduleForDate = (schedule, dateString) => {
  const weekday = WEEKDAYS[new Date(`${dateString}T00:00:00`).getDay()];
  const ranges = [];
  for (const entry of schedule || []) {
    if (!String(entry).startsWith(`${weekday} `)) continue;
    const match = String(entry).match(/(\d{2}):(\d{2})[–-](\d{2}):(\d{2})/);
    if (!match) continue;
    ranges.push({
      start: Number(match[1]) * 60 + Number(match[2]),
      end: Number(match[3]) * 60 + Number(match[4])
    });
  }
  return ranges;
};

const buildSlots = (schedule, dateString, bookedTimes, slotMinutes = 60) => {
  const ranges = parseScheduleForDate(schedule, dateString);
  const booked = new Set((bookedTimes || []).map(value => String(value).slice(0, 5)));
  const slots = [];
  const today = todayISO();
  const current = nowTime();
  for (const range of ranges) {
    for (let start = range.start; start + slotMinutes <= range.end; start += slotMinutes) {
      const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
      if (booked.has(time)) continue;
      if (dateString < today) continue;
      if (dateString === today && time <= current) continue;
      slots.push(time);
    }
  }
  return [...new Set(slots)].sort();
};

module.exports = {
  HttpError,
  asyncRoute,
  todayISO,
  nowTime,
  addMonths,
  isDateString,
  isTimeString,
  normalizeEmail,
  isEmail,
  text,
  mapUser,
  mapTrainer,
  mapAppointment,
  mapEntitlement,
  isEntitlementActive,
  buildSlots,
  parseScheduleForDate
};
