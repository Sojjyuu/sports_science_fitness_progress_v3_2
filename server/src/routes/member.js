const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { ensurePendingEntitlement, listEntitlements } = require('../entitlements');
const {
  HttpError, asyncRoute, text, isDateString, isTimeString, todayISO, nowTime,
  mapUser, mapTrainer, mapAppointment, mapEntitlement, buildSlots
} = require('../utils');

const router = express.Router();
router.use(requireAuth, requireRole('member'));

const APPOINTMENT_SELECT = `
  SELECT ap.*, t.name AS trainer_name, m.full_name AS member_name, m.email AS member_email
  FROM appointments ap
  JOIN trainers t ON t.id = ap.trainer_id
  JOIN accounts m ON m.id = ap.member_id`;

const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725, 1.9];
const GOALS = ['weight-loss', 'muscle-gain', 'general', 'performance', 'rehabilitation'];
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];

async function memberPayload(memberId) {
  const [accountResult, entitlements] = await Promise.all([
    db.query(
      `SELECT a.*, f.name AS fitness_package_name, tp.name AS trainer_package_name, tr.name AS selected_trainer_name
       FROM accounts a
       LEFT JOIN fitness_packages f ON f.id = a.fitness_package_id
       LEFT JOIN trainer_packages tp ON tp.id = a.trainer_package_id
       LEFT JOIN trainers tr ON tr.id = a.selected_trainer_id
       WHERE a.id = $1`,
      [memberId]
    ),
    listEntitlements(memberId)
  ]);
  const account = accountResult.rows[0];
  if (!account) throw new HttpError(404, 'ไม่พบสมาชิก');

  return {
    user: {
      ...mapUser(account),
      fitnessPackageName: account.fitness_package_name || null,
      trainerPackageName: account.trainer_package_name || null,
      selectedTrainerName: account.selected_trainer_name || null
    },
    entitlements: entitlements.map(mapEntitlement)
  };
}

function assertFuture(date, time) {
  if (!isDateString(date)) throw new HttpError(400, 'รูปแบบวันที่ไม่ถูกต้อง');
  if (!isTimeString(time)) throw new HttpError(400, 'รูปแบบเวลาไม่ถูกต้อง');
  if (date < todayISO()) throw new HttpError(400, 'ไม่สามารถจองวันย้อนหลังได้');
  if (date === todayISO() && time <= nowTime()) throw new HttpError(400, 'กรุณาเลือกเวลาในอนาคต');
}

async function assertSlotAvailable(trainerId, date, time, excludeAppointmentId = null) {
  const trainerResult = await db.query('SELECT * FROM trainers WHERE id = $1 AND active = true', [trainerId]);
  const trainer = trainerResult.rows[0];
  if (!trainer) throw new HttpError(404, 'ไม่พบเทรนเนอร์');

  const params = [trainerId, date];
  let excludeSql = '';
  if (excludeAppointmentId) {
    params.push(excludeAppointmentId);
    excludeSql = ' AND id <> $3';
  }
  const booked = await db.query(
    `SELECT time FROM appointments
     WHERE trainer_id = $1 AND date = $2 AND status IN ('requested', 'confirmed')${excludeSql}`,
    params
  );
  const slots = buildSlots(trainer.schedule, date, booked.rows.map(row => row.time));
  if (!slots.includes(time)) throw new HttpError(409, 'เวลานี้ไม่ว่างหรืออยู่นอกตารางให้บริการ');
  return trainer;
}

router.get('/', asyncRoute(async (req, res) => {
  res.json(await memberPayload(req.user.id));
}));

router.patch('/profile', asyncRoute(async (req, res) => {
  const firstName = text(req.body.firstName);
  const lastName = text(req.body.lastName);
  const fullNameInput = text(req.body.fullName);
  const phone = text(req.body.phone);

  const fullName = fullNameInput || [firstName, lastName].filter(Boolean).join(' ').trim();
  if (!fullName || fullName.length < 2) throw new HttpError(400, 'กรุณากรอกชื่อ-นามสกุลให้ครบ');
  if (phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)) throw new HttpError(400, 'รูปแบบเบอร์โทรไม่ถูกต้อง');

  await db.query(
    `UPDATE accounts SET full_name = $2, phone = $3 WHERE id = $1`,
    [req.user.id, fullName, phone || null]
  );
  res.json(await memberPayload(req.user.id));
}));

router.patch('/preferences', asyncRoute(async (req, res) => {
  const fields = [];
  const values = [req.user.id];
  const set = (column, value) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  const selectedTrainerId = req.body.selectedTrainerId === undefined ? undefined : (req.body.selectedTrainerId || null);
  const fitnessPackageId = req.body.fitnessPackageId === undefined ? undefined : (req.body.fitnessPackageId || null);
  const trainerPackageId = req.body.trainerPackageId === undefined ? undefined : (req.body.trainerPackageId || null);

  if (selectedTrainerId) {
    const check = await db.query('SELECT 1 FROM trainers WHERE id = $1 AND active = true', [selectedTrainerId]);
    if (!check.rowCount) throw new HttpError(400, 'ไม่พบเทรนเนอร์ที่เลือก');
  }
  if (fitnessPackageId) {
    const check = await db.query('SELECT 1 FROM fitness_packages WHERE id = $1', [fitnessPackageId]);
    if (!check.rowCount) throw new HttpError(400, 'ไม่พบแพ็กเกจฟิตเนสที่เลือก');
  }
  if (trainerPackageId) {
    const check = await db.query('SELECT 1 FROM trainer_packages WHERE id = $1', [trainerPackageId]);
    if (!check.rowCount) throw new HttpError(400, 'ไม่พบแพ็กเกจเทรนเนอร์ที่เลือก');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    if (selectedTrainerId !== undefined) set('selected_trainer_id', selectedTrainerId);
    if (fitnessPackageId !== undefined) set('fitness_package_id', fitnessPackageId);
    if (trainerPackageId !== undefined) set('trainer_package_id', trainerPackageId);
    if (!fields.length) throw new HttpError(400, 'ไม่มีข้อมูลที่ต้องอัปเดต');

    await client.query(`UPDATE accounts SET ${fields.join(', ')} WHERE id = $1`, values);

    if (fitnessPackageId) await ensurePendingEntitlement(client, req.user.id, 'fitness', fitnessPackageId);
    if (trainerPackageId) await ensurePendingEntitlement(client, req.user.id, 'trainer', trainerPackageId);

    await client.query('COMMIT');
    res.json(await memberPayload(req.user.id));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}));

router.get('/appointments', asyncRoute(async (req, res) => {
  const { rows } = await db.query(
    `${APPOINTMENT_SELECT} WHERE ap.member_id = $1 ORDER BY ap.date, ap.time`,
    [req.user.id]
  );
  res.json({ appointments: rows.map(mapAppointment) });
}));

router.post('/appointments', asyncRoute(async (req, res) => {
  const trainerId = text(req.body.trainerId);
  const date = text(req.body.date);
  const time = text(req.body.time);
  if (!trainerId) throw new HttpError(400, 'กรุณาเลือกเทรนเนอร์');
  assertFuture(date, time);
  const trainer = await assertSlotAvailable(trainerId, date, time);

  try {
    const { rows } = await db.query(
      `INSERT INTO appointments (member_id, trainer_id, date, time, status, created_by)
       VALUES ($1, $2, $3, $4, 'requested', $1)
       RETURNING *`,
      [req.user.id, trainerId, date, time]
    );
    const appointment = {
      ...rows[0],
      trainer_name: trainer.name,
      member_name: req.user.full_name,
      member_email: req.user.email
    };
    res.status(201).json({ appointment: mapAppointment(appointment) });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'เวลานี้มีนัดซ้อน กรุณาเลือกใหม่');
    throw error;
  }
}));

router.patch('/appointments/:id', asyncRoute(async (req, res) => {
  const { rows: ownRows } = await db.query(
    'SELECT * FROM appointments WHERE id = $1 AND member_id = $2',
    [req.params.id, req.user.id]
  );
  const appointment = ownRows[0];
  if (!appointment) throw new HttpError(404, 'ไม่พบนัดหมาย');
  if (!['requested', 'confirmed'].includes(appointment.status)) {
    throw new HttpError(409, 'แก้ไขได้เฉพาะนัดที่ยังไม่เริ่มหรือยังไม่ถูกยกเลิก');
  }

  if (req.body.status === 'cancelled') {
    await db.query(
      `UPDATE appointments SET status = 'cancelled', cancel_reason = $2 WHERE id = $1`,
      [appointment.id, 'member']
    );
    const { rows } = await db.query(`${APPOINTMENT_SELECT} WHERE ap.id = $1`, [appointment.id]);
    return res.json({ appointment: mapAppointment(rows[0]) });
  }

  const date = text(req.body.date);
  const time = text(req.body.time);
  assertFuture(date, time);
  await assertSlotAvailable(appointment.trainer_id, date, time, appointment.id);

  try {
    await db.query(
      `UPDATE appointments SET date = $2, time = $3, status = 'requested', cancel_reason = NULL WHERE id = $1`,
      [appointment.id, date, time]
    );
    const { rows } = await db.query(`${APPOINTMENT_SELECT} WHERE ap.id = $1`, [appointment.id]);
    res.json({ appointment: mapAppointment(rows[0]) });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'เวลานี้มีนัดซ้อน กรุณาเลือกใหม่');
    throw error;
  }
}));

router.delete('/appointments/:id', asyncRoute(async (req, res) => {
  const { rowCount } = await db.query(
    `UPDATE appointments SET status = 'cancelled', cancel_reason = 'member'
     WHERE id = $1 AND member_id = $2 AND status IN ('requested', 'confirmed')`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) throw new HttpError(404, 'ไม่พบนัดที่ยกเลิกได้');
  res.json({ ok: true });
}));

function calculateHealth(input) {
  const weight = Number(input.weight);
  const height = Number(input.height);
  const age = Number(input.age);
  const activity = Number(input.activity);
  const bmr = 10 * weight + 6.25 * height - 5 * age + (input.sex === 'male' ? 5 : -161);
  const tdee = bmr * activity;
  const adjustment = input.goal === 'weight-loss' ? -400 : input.goal === 'muscle-gain' ? 250 : 0;
  const bmi = weight / (height / 100) ** 2;
  const bmiCategory = bmi < 18.5 ? 'น้ำหนักต่ำกว่าเกณฑ์' : bmi < 23 ? 'สมส่วน' : bmi < 25 ? 'น้ำหนักเกิน' : bmi < 30 ? 'อ้วนระดับ 1' : 'อ้วนระดับ 2';
  return {
    bmi: Number(bmi.toFixed(1)),
    bmiCategory,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(Math.max(1200, tdee + adjustment)),
    protein: Math.round(weight * (input.goal === 'muscle-gain' ? 1.8 : 1.5)),
    bodyFat: input.bodyFat ? Number(input.bodyFat) : null
  };
}

function mapHealth(row) {
  if (!row) return null;
  return {
    age: row.age,
    sex: row.gender,
    height: Number(row.height_cm),
    weight: Number(row.weight_kg),
    bodyFat: row.body_fat === null ? '' : Number(row.body_fat),
    activity: row.activity_level,
    experienceLevel: row.experience_level,
    goal: row.goal,
    limitations: row.limitations || '',
    results: row.results,
    updatedAt: row.updated_at
  };
}

router.get('/health', asyncRoute(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM health_profiles WHERE member_id = $1', [req.user.id]);
  res.json({ profile: mapHealth(rows[0]) });
}));

router.put('/health', asyncRoute(async (req, res) => {
  const age = Number(req.body.age);
  const height = Number(req.body.height);
  const weight = Number(req.body.weight);
  const activity = Number(req.body.activity);
  const bodyFat = req.body.bodyFat === '' || req.body.bodyFat === undefined ? null : Number(req.body.bodyFat);
  const sex = req.body.sex === 'male' ? 'male' : req.body.sex === 'female' ? 'female' : null;
  const goal = text(req.body.goal);
  const experienceLevel = text(req.body.experienceLevel);
  const limitations = text(req.body.limitations);

  if (!sex || !goal || !activity || !experienceLevel) throw new HttpError(400, 'กรุณากรอกข้อมูลสุขภาพให้ครบ');
  if (!(age >= 15 && age <= 100)) throw new HttpError(400, 'อายุควรอยู่ระหว่าง 15–100 ปี');
  if (!(height >= 120 && height <= 230)) throw new HttpError(400, 'ส่วนสูงควรอยู่ระหว่าง 120–230 ซม.');
  if (!(weight >= 30 && weight <= 300)) throw new HttpError(400, 'น้ำหนักควรอยู่ระหว่าง 30–300 กก.');
  if (bodyFat !== null && !(bodyFat >= 3 && bodyFat <= 70)) throw new HttpError(400, 'เปอร์เซ็นต์ไขมันควรอยู่ระหว่าง 3–70%');
  if (!ACTIVITY_LEVELS.includes(activity)) throw new HttpError(400, 'ระดับกิจกรรมไม่ถูกต้อง');
  if (!GOALS.includes(goal)) throw new HttpError(400, 'เป้าหมายไม่ถูกต้อง');
  if (!EXPERIENCE_LEVELS.includes(experienceLevel)) throw new HttpError(400, 'ระดับประสบการณ์ไม่ถูกต้อง');

  const results = calculateHealth({ age, height, weight, activity, sex, goal, bodyFat });

  await db.query(
    `INSERT INTO health_profiles (member_id, age, gender, height_cm, weight_kg, body_fat, activity_level,
       experience_level, goal, limitations, results)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (member_id) DO UPDATE SET
       age = EXCLUDED.age, gender = EXCLUDED.gender, height_cm = EXCLUDED.height_cm,
       weight_kg = EXCLUDED.weight_kg, body_fat = EXCLUDED.body_fat,
       activity_level = EXCLUDED.activity_level, experience_level = EXCLUDED.experience_level,
       goal = EXCLUDED.goal, limitations = EXCLUDED.limitations, results = EXCLUDED.results,
       updated_at = now()`,
    [req.user.id, age, sex, height, weight, bodyFat, String(activity), experienceLevel, goal, limitations, results]
  );

  const { rows } = await db.query('SELECT * FROM health_profiles WHERE member_id = $1', [req.user.id]);
  res.json({ profile: mapHealth(rows[0]) });
}));

router.get('/access', asyncRoute(async (req, res) => {
  const [cardResult, logResult] = await Promise.all([
    db.query(
      `SELECT * FROM rfid_cards WHERE member_id = $1
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, created_at DESC
       LIMIT 1`,
      [req.user.id]
    ),
    db.query(
      `SELECT id, entered_at, direction, source, allowed FROM access_logs
       WHERE member_id = $1 ORDER BY entered_at DESC LIMIT 20`,
      [req.user.id]
    )
  ]);
  const card = cardResult.rows[0] || null;
  res.json({
    card: card ? {
      id: card.id,
      cardUid: card.card_uid,
      status: card.status,
      issuedAt: card.issued_at,
      suspendedAt: card.suspended_at
    } : null,
    logs: logResult.rows
  });
}));

module.exports = router;
