const express = require('express');
const db = require('../db');
const { asyncRoute, HttpError, isDateString, mapTrainer, buildSlots, todayISO } = require('../utils');

const router = express.Router();

const mapPackage = row => ({
  id: row.id,
  label: row.label,
  name: row.name,
  price: Number(row.price),
  unit: row.unit,
  months: row.months ?? null,
  sessions: row.sessions ?? null,
  featured: row.featured,
  features: row.features || []
});

router.get('/trainers', asyncRoute(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM trainers WHERE active = true ORDER BY sort_order, name');
  res.json({ trainers: rows.map(mapTrainer) });
}));

router.get('/trainers/:id', asyncRoute(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM trainers WHERE id = $1 AND active = true', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'ไม่พบเทรนเนอร์');
  res.json({ trainer: mapTrainer(rows[0]) });
}));

/* ตารางว่างของโค้ชในแต่ละวัน (คำนวณจาก schedule และนัดที่ยังไม่ยกเลิก) */
router.get('/trainers/:id/availability', asyncRoute(async (req, res) => {
  const date = String(req.query.date || '');
  if (!isDateString(date)) throw new HttpError(400, 'รูปแบบวันที่ไม่ถูกต้อง');
  if (date < todayISO()) throw new HttpError(400, 'ไม่สามารถดูเวลาของวันย้อนหลังได้');

  const trainerRows = await db.query('SELECT * FROM trainers WHERE id = $1 AND active = true', [req.params.id]);
  const trainer = trainerRows.rows[0];
  if (!trainer) throw new HttpError(404, 'ไม่พบเทรนเนอร์');

  const booked = await db.query(
    `SELECT time FROM appointments
     WHERE trainer_id = $1 AND date = $2 AND status IN ('requested', 'confirmed')`,
    [req.params.id, date]
  );

  res.json({
    trainerId: trainer.id,
    date,
    schedule: trainer.schedule,
    slots: buildSlots(trainer.schedule, date, booked.rows.map(row => row.time))
  });
}));

router.get('/packages', asyncRoute(async (req, res) => {
  const [fitness, trainer] = await Promise.all([
    db.query('SELECT * FROM fitness_packages ORDER BY sort_order, name'),
    db.query('SELECT * FROM trainer_packages ORDER BY sort_order, name')
  ]);
  res.json({
    fitness: fitness.rows.map(mapPackage),
    trainer: trainer.rows.map(mapPackage)
  });
}));

module.exports = router;
