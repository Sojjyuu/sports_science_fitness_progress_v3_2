const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const {
  HttpError, asyncRoute, mapTrainer, mapAppointment, todayISO
} = require('../utils');

const router = express.Router();
router.use(requireAuth, requireRole('coach'));

const APPOINTMENT_SELECT = `
  SELECT ap.*, t.name AS trainer_name, m.full_name AS member_name, m.email AS member_email
  FROM appointments ap
  JOIN trainers t ON t.id = ap.trainer_id
  JOIN accounts m ON m.id = ap.member_id`;

async function ownTrainer(req) {
  const { rows } = await db.query('SELECT * FROM trainers WHERE account_id = $1 AND active = true', [req.user.id]);
  if (!rows[0]) throw new HttpError(403, 'บัญชีนี้ยังไม่ผูกกับโปรไฟล์เทรนเนอร์ กรุณาติดต่อผู้ดูแลระบบ');
  return rows[0];
}

async function listCoachAppointments(trainerId) {
  const { rows } = await db.query(
    `${APPOINTMENT_SELECT} WHERE ap.trainer_id = $1 ORDER BY ap.date, ap.time`,
    [trainerId]
  );
  return rows.map(mapAppointment);
}

async function listClients(trainerId) {
  const { rows } = await db.query(
    `SELECT a.id, a.full_name, a.email,
            count(ap.id) FILTER (WHERE ap.status <> 'cancelled') AS appointments,
            max(ap.date) FILTER (WHERE ap.status <> 'cancelled') AS last_date,
            n.note, n.updated_at AS note_updated_at
     FROM accounts a
     LEFT JOIN appointments ap ON ap.member_id = a.id AND ap.trainer_id = $1
     LEFT JOIN coach_notes n ON n.member_id = a.id AND n.trainer_id = $1
     WHERE ap.id IS NOT NULL OR a.selected_trainer_id = $1
     GROUP BY a.id, n.note, n.updated_at
     ORDER BY a.full_name`,
    [trainerId]
  );
  return rows.map(row => ({
    id: row.id,
    name: row.full_name,
    email: row.email,
    appointments: Number(row.appointments),
    lastDate: row.last_date,
    note: row.note || '',
    noteUpdatedAt: row.note_updated_at
  }));
}

router.get('/dashboard', asyncRoute(async (req, res) => {
  const trainer = await ownTrainer(req);
  const [appointments, clients] = await Promise.all([
    listCoachAppointments(trainer.id),
    listClients(trainer.id)
  ]);
  const today = todayISO();
  const open = appointments.filter(item => ['requested', 'confirmed'].includes(item.status));
  res.json({
    trainer: mapTrainer(trainer),
    summary: {
      today: open.filter(item => item.date === today).length,
      upcoming: open.filter(item => item.date >= today).length,
      requested: appointments.filter(item => item.status === 'requested').length,
      clients: clients.length,
      scheduleDays: (trainer.schedule || []).length
    },
    appointments,
    clients
  });
}));

router.get('/appointments', asyncRoute(async (req, res) => {
  const trainer = await ownTrainer(req);
  let appointments = await listCoachAppointments(trainer.id);
  const date = String(req.query.date || '');
  const status = String(req.query.status || '');
  if (date) appointments = appointments.filter(item => item.date === date);
  if (status === 'open') appointments = appointments.filter(item => ['requested', 'confirmed'].includes(item.status));
  else if (status === 'upcoming') appointments = appointments.filter(item => item.date >= todayISO() && ['requested', 'confirmed'].includes(item.status));
  else if (status === 'cancelled') appointments = appointments.filter(item => item.status === 'cancelled');
  res.json({ appointments });
}));

router.patch('/appointments/:id', asyncRoute(async (req, res) => {
  const trainer = await ownTrainer(req);
  const status = String(req.body.status || '');
  if (!['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
    throw new HttpError(400, 'สถานะนัดหมายไม่ถูกต้อง');
  }

  const { rows: ownRows } = await db.query(
    'SELECT * FROM appointments WHERE id = $1 AND trainer_id = $2',
    [req.params.id, trainer.id]
  );
  const current = ownRows[0];
  if (!current) throw new HttpError(404, 'ไม่พบนัดหมายของโค้ชคนนี้');

  /* โค้ชเปลี่ยนได้เฉพาะสถานะถัดไปที่สมเหตุสมผล ไม่เปิดนัดที่จบแล้วกลับมาใหม่ */
  const allowedNext = {
    requested: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled', 'no_show']
  };
  if (!(allowedNext[current.status] || []).includes(status)) {
    throw new HttpError(409, `ไม่สามารถเปลี่ยนสถานะจาก ${current.status} เป็น ${status} ได้`);
  }

  await db.query(
    `UPDATE appointments SET status = $2, cancel_reason = $3 WHERE id = $1`,
    [req.params.id, status, status === 'cancelled' ? 'coach' : null]
  );
  const { rows } = await db.query(`${APPOINTMENT_SELECT} WHERE ap.id = $1`, [req.params.id]);
  res.json({ appointment: mapAppointment(rows[0]) });
}));

async function assertRelatedClient(trainerId, memberId) {
  const { rows } = await db.query(
    `SELECT 1 FROM accounts a
     WHERE a.id = $2 AND (a.selected_trainer_id = $1
       OR EXISTS (SELECT 1 FROM appointments ap WHERE ap.trainer_id = $1 AND ap.member_id = a.id))`,
    [trainerId, memberId]
  );
  if (!rows.length) throw new HttpError(404, 'ไม่พบลูกค้าที่เกี่ยวข้องกับโค้ชคนนี้');
}

router.get('/clients', asyncRoute(async (req, res) => {
  const trainer = await ownTrainer(req);
  res.json({ clients: await listClients(trainer.id) });
}));

router.get('/clients/:memberId/note', asyncRoute(async (req, res) => {
  const trainer = await ownTrainer(req);
  await assertRelatedClient(trainer.id, req.params.memberId);
  const { rows } = await db.query(
    'SELECT note, updated_at FROM coach_notes WHERE trainer_id = $1 AND member_id = $2',
    [trainer.id, req.params.memberId]
  );
  res.json({ note: rows[0]?.note || '', updatedAt: rows[0]?.updated_at || null });
}));

router.put('/clients/:memberId/note', asyncRoute(async (req, res) => {
  const trainer = await ownTrainer(req);
  await assertRelatedClient(trainer.id, req.params.memberId);
  const note = String(req.body.note || '').slice(0, 2000);

  const { rows } = await db.query(
    `INSERT INTO coach_notes (trainer_id, member_id, note, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (trainer_id, member_id) DO UPDATE SET
       note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = now()
     RETURNING note, updated_at`,
    [trainer.id, req.params.memberId, note, req.user.id]
  );
  res.json({ note: rows[0].note, updatedAt: rows[0].updated_at });
}));

module.exports = router;
