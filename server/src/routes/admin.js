const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const {
  HttpError, asyncRoute, text, todayISO, addMonths, isDateString,
  mapTrainer, mapAppointment, mapEntitlement, isEntitlementActive
} = require('../utils');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const APPOINTMENT_SELECT = `
  SELECT ap.*, t.name AS trainer_name, m.full_name AS member_name, m.email AS member_email
  FROM appointments ap
  JOIN trainers t ON t.id = ap.trainer_id
  JOIN accounts m ON m.id = ap.member_id`;

async function getEntitlementRows() {
  const { rows } = await db.query(
    `SELECT e.*,
            CASE WHEN e.kind = 'fitness' THEN f.name ELSE tp.name END AS package_name,
            a.full_name AS member_name, a.email AS member_email
     FROM entitlements e
     JOIN accounts a ON a.id = e.member_id
     LEFT JOIN fitness_packages f ON e.kind = 'fitness' AND f.id = e.package_id
     LEFT JOIN trainer_packages tp ON e.kind = 'trainer' AND tp.id = e.package_id
     ORDER BY e.created_at DESC`
  );
  return rows;
}

async function getMembers() {
  const [accountResult, entitlementRows, packageResult] = await Promise.all([
    db.query(
      `SELECT a.*, tr.name AS coach_name
       FROM accounts a
       LEFT JOIN trainers tr ON tr.id = a.selected_trainer_id
       WHERE a.role = 'member'
       ORDER BY a.created_at DESC`
    ),
    getEntitlementRows(),
    Promise.all([
      db.query('SELECT id, name FROM fitness_packages'),
      db.query('SELECT id, name FROM trainer_packages')
    ])
  ]);
  const fitnessNames = new Map(packageResult[0].rows.map(row => [row.id, row.name]));
  const trainerNames = new Map(packageResult[1].rows.map(row => [row.id, row.name]));

  return accountResult.rows.map(account => ({
    id: account.id,
    fullName: account.full_name,
    name: account.full_name,
    email: account.email,
    phone: account.phone,
    studentId: account.student_id,
    status: account.status,
    createdAt: account.created_at,
    planId: account.fitness_package_id,
    fitnessPackageName: fitnessNames.get(account.fitness_package_id) || null,
    trainerPackageId: account.trainer_package_id,
    trainerPackageName: trainerNames.get(account.trainer_package_id) || null,
    selectedTrainerId: account.selected_trainer_id,
    coachName: account.coach_name || null,
    entitlements: entitlementRows
      .filter(row => row.member_id === account.id)
      .map(mapEntitlement)
  }));
}

async function getAppointments({ date, trainerId } = {}) {
  const conditions = [];
  const values = [];
  if (date) {
    values.push(date);
    conditions.push(`ap.date = $${values.length}`);
  }
  if (trainerId) {
    values.push(trainerId);
    conditions.push(`ap.trainer_id = $${values.length}`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await db.query(
    `${APPOINTMENT_SELECT}${where} ORDER BY ap.date, ap.time`,
    values
  );
  return rows.map(mapAppointment);
}

async function getCoaches() {
  const { rows } = await db.query(
    `SELECT t.*,
       (SELECT count(*) FROM appointments ap WHERE ap.trainer_id = t.id AND ap.status IN ('requested','confirmed')) AS upcoming,
       (SELECT count(*) FROM appointments ap WHERE ap.trainer_id = t.id AND ap.status <> 'cancelled') AS total,
       (SELECT count(DISTINCT a.id) FROM accounts a
         WHERE a.role = 'member' AND (a.selected_trainer_id = t.id
           OR EXISTS (SELECT 1 FROM appointments ap WHERE ap.trainer_id = t.id AND ap.member_id = a.id))) AS clients
     FROM trainers t WHERE t.active = true ORDER BY t.sort_order, t.name`
  );
  return rows.map(row => ({
    ...mapTrainer(row),
    upcoming: Number(row.upcoming),
    total: Number(row.total),
    clients: Number(row.clients)
  }));
}

router.get('/dashboard', asyncRoute(async (req, res) => {
  const [members, appointments, coaches, entitlements] = await Promise.all([
    getMembers(),
    getAppointments(),
    getCoaches(),
    getEntitlementRows()
  ]);
  const today = todayISO();
  const { rows: cardCounts } = await db.query(
    `SELECT status, count(*)::int AS count FROM rfid_cards GROUP BY status`
  );
  const cards = { pending: 0, active: 0, suspended: 0, total: 0 };
  for (const row of cardCounts) {
    cards[row.status] = row.count;
    cards.total += row.count;
  }

  res.json({
    summary: {
      members: members.length,
      activeEntitlements: entitlements.filter(isEntitlementActive).length,
      pendingEntitlements: entitlements.filter(row => row.status === 'pending').length,
      todayAppointments: appointments.filter(item => item.date === today && ['requested', 'confirmed'].includes(item.status)).length,
      coaches: coaches.length,
      cancelledAppointments: appointments.filter(item => item.status === 'cancelled').length,
      cards: cards.total
    },
    members,
    appointments,
    coaches,
    entitlements: entitlements.map(row => ({
      ...mapEntitlement(row),
      memberId: row.member_id,
      memberName: row.member_name,
      memberEmail: row.member_email
    })),
    rfid: cards
  });
}));

router.get('/members', asyncRoute(async (req, res) => {
  const query = text(req.query.q).toLowerCase();
  const status = String(req.query.status || 'all');
  let members = await getMembers();
  if (query) members = members.filter(member => `${member.fullName} ${member.email}`.toLowerCase().includes(query));
  if (status === 'active') members = members.filter(member => member.entitlements.some(item => item.active));
  else if (status === 'pending') {
    members = members.filter(member => !member.entitlements.some(item => item.active && item.kind === 'fitness'));
  }
  res.json({ members });
}));

router.patch('/members/:id', asyncRoute(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['active', 'suspended'].includes(status)) throw new HttpError(400, 'สถานะบัญชีไม่ถูกต้อง');
  const { rowCount } = await db.query(
    `UPDATE accounts SET status = $2 WHERE id = $1 AND role = 'member'`,
    [req.params.id, status]
  );
  if (!rowCount) throw new HttpError(404, 'ไม่พบสมาชิก');
  res.json({ ok: true, status });
}));

router.get('/appointments', asyncRoute(async (req, res) => {
  res.json({
    appointments: await getAppointments({
      date: String(req.query.date || ''),
      trainerId: String(req.query.trainerId || '')
    })
  });
}));

router.patch('/appointments/:id', asyncRoute(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['requested', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
    throw new HttpError(400, 'สถานะนัดหมายไม่ถูกต้อง');
  }
  const { rowCount } = await db.query(
    `UPDATE appointments SET status = $2, cancel_reason = $3 WHERE id = $1`,
    [req.params.id, status, status === 'cancelled' ? 'admin' : null]
  );
  if (!rowCount) throw new HttpError(404, 'ไม่พบนัดหมาย');
  const { rows } = await db.query(`${APPOINTMENT_SELECT} WHERE ap.id = $1`, [req.params.id]);
  res.json({ appointment: mapAppointment(rows[0]) });
}));

router.get('/coaches', asyncRoute(async (req, res) => {
  res.json({ coaches: await getCoaches() });
}));

router.get('/entitlements', asyncRoute(async (req, res) => {
  let rows = await getEntitlementRows();
  const status = String(req.query.status || '');
  if (status) rows = rows.filter(row => row.status === status);
  res.json({
    entitlements: rows.map(row => ({
      ...mapEntitlement(row),
      memberId: row.member_id,
      memberName: row.member_name,
      memberEmail: row.member_email
    }))
  });
}));

router.patch('/entitlements/:id', asyncRoute(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['pending', 'confirmed', 'cancelled', 'expired'].includes(status)) {
    throw new HttpError(400, 'สถานะสิทธิ์ไม่ถูกต้อง');
  }

  const { rows: currentRows } = await db.query('SELECT * FROM entitlements WHERE id = $1', [req.params.id]);
  const current = currentRows[0];
  if (!current) throw new HttpError(404, 'ไม่พบสิทธิ์ที่ต้องการแก้ไข');

  if (req.body.startDate !== undefined && req.body.startDate !== null && req.body.startDate !== '' && !isDateString(req.body.startDate)) {
    throw new HttpError(400, 'รูปแบบวันเริ่มสิทธิ์ไม่ถูกต้อง');
  }
  if (req.body.expireDate !== undefined && req.body.expireDate !== null && req.body.expireDate !== '' && !isDateString(req.body.expireDate)) {
    throw new HttpError(400, 'รูปแบบวันหมดอายุไม่ถูกต้อง');
  }
  if (req.body.sessionsUsed !== undefined) {
    const used = Number(req.body.sessionsUsed);
    if (!Number.isInteger(used) || used < 0) throw new HttpError(400, 'จำนวนครั้งที่ใช้ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
  }
  if (req.body.sessionsTotal !== undefined) {
    const total = Number(req.body.sessionsTotal);
    if (!Number.isInteger(total) || total < 0) throw new HttpError(400, 'จำนวนครั้งทั้งหมดต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
  }

  let startDate = req.body.startDate ? text(req.body.startDate) : current.start_date;
  let expireDate = req.body.expireDate ? text(req.body.expireDate) : current.expire_date;
  let sessionsTotal = req.body.sessionsTotal !== undefined ? Number(req.body.sessionsTotal) : current.sessions_total;

  if (startDate && expireDate && expireDate < startDate) {
    throw new HttpError(400, 'วันหมดอายุต้องไม่ก่อนวันเริ่มสิทธิ์');
  }

  if (status === 'confirmed' && !expireDate && current.kind === 'fitness') {
    const pkg = await db.query('SELECT months FROM fitness_packages WHERE id = $1', [current.package_id]);
    if (pkg.rows[0]) {
      startDate = startDate || todayISO();
      expireDate = addMonths(startDate, pkg.rows[0].months);
    }
  }
  if (status === 'confirmed' && sessionsTotal === null && current.kind === 'trainer') {
    const pkg = await db.query('SELECT sessions FROM trainer_packages WHERE id = $1', [current.package_id]);
    if (pkg.rows[0]) sessionsTotal = pkg.rows[0].sessions;
  }

  try {
    await db.query(
      `UPDATE entitlements
       SET status = $2, start_date = $3, expire_date = $4, sessions_total = $5,
           sessions_used = COALESCE($6, sessions_used), confirmed_by = $7
       WHERE id = $1`,
      [
        req.params.id, status, startDate || null, expireDate || null,
        sessionsTotal, req.body.sessionsUsed !== undefined ? Number(req.body.sessionsUsed) : null,
        status === 'confirmed' ? req.user.id : current.confirmed_by
      ]
    );
    const rows = await getEntitlementRows();
    const row = rows.find(item => item.id === req.params.id);
    res.json({ entitlement: { ...mapEntitlement(row), memberId: row.member_id, memberName: row.member_name, memberEmail: row.member_email } });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'สมาชิกมีสิทธิ์ชนิดนี้ที่ยังเปิดใช้งานอยู่แล้ว');
    throw error;
  }
}));

router.get('/rfid-cards', asyncRoute(async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*, a.full_name AS member_name, a.email AS member_email
     FROM rfid_cards c JOIN accounts a ON a.id = c.member_id
     ORDER BY c.created_at DESC`
  );
  res.json({
    cards: rows.map(row => ({
      id: row.id,
      memberId: row.member_id,
      memberName: row.member_name,
      memberEmail: row.member_email,
      cardUid: row.card_uid,
      status: row.status,
      issuedAt: row.issued_at,
      suspendedAt: row.suspended_at
    }))
  });
}));

router.post('/rfid-cards', asyncRoute(async (req, res) => {
  const memberId = text(req.body.memberId);
  const cardUid = text(req.body.cardUid);
  if (!memberId || !cardUid) throw new HttpError(400, 'กรุณาเลือกลูกค้าและกรอกหมายเลขบัตร');

  const openCards = await db.query(
    `SELECT id FROM rfid_cards WHERE member_id = $1 AND status IN ('pending', 'active')`,
    [memberId]
  );
  if (openCards.rowCount) {
    throw new HttpError(409, 'สมาชิกคนนี้มีบัตรที่ยังเปิดใช้งานอยู่ กรุณาระงับบัตรเดิมก่อนออกบัตรใหม่');
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO rfid_cards (member_id, card_uid, status, issued_at)
       VALUES ($1, $2, 'pending', $3) RETURNING *`,
      [memberId, cardUid, todayISO()]
    );
    res.status(201).json({ card: rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'หมายเลขบัตรนี้ถูกใช้แล้ว หรือสมาชิกมีบัตรที่ยังเปิดใช้งานอยู่');
    if (error.code === '23503') throw new HttpError(404, 'ไม่พบสมาชิก');
    throw error;
  }
}));

router.patch('/rfid-cards/:id', asyncRoute(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['pending', 'active', 'suspended'].includes(status)) throw new HttpError(400, 'สถานะบัตรไม่ถูกต้อง');

  const current = await db.query('SELECT * FROM rfid_cards WHERE id = $1', [req.params.id]);
  if (!current.rows[0]) throw new HttpError(404, 'ไม่พบบัตร');

  if (status !== 'suspended') {
    const otherOpen = await db.query(
      `SELECT id FROM rfid_cards
       WHERE member_id = $1 AND id <> $2 AND status IN ('pending', 'active')`,
      [current.rows[0].member_id, req.params.id]
    );
    if (otherOpen.rowCount) {
      throw new HttpError(409, 'สมาชิกคนนี้มีบัตรอื่นที่ยังเปิดใช้งานอยู่ กรุณาระงับบัตรนั้นก่อน');
    }
  }

  const suspendedAt = status === 'suspended' ? todayISO() : null;
  try {
    const { rows } = await db.query(
      `UPDATE rfid_cards SET status = $2, suspended_at = $3 WHERE id = $1 RETURNING *`,
      [req.params.id, status, suspendedAt]
    );
    res.json({ card: rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'สมาชิกคนนี้มีบัตรที่ยังเปิดใช้งานอยู่');
    throw error;
  }
}));

router.get('/staff', asyncRoute(async (req, res) => {
  const { rows } = await db.query(
    `SELECT a.id, a.email, a.full_name, a.role, a.status, t.id AS trainer_id, t.name AS trainer_name
     FROM accounts a LEFT JOIN trainers t ON t.account_id = a.id
     WHERE a.role IN ('coach', 'admin') ORDER BY a.role, a.full_name`
  );
  res.json({
    staff: rows.map(row => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      trainerId: row.trainer_id,
      trainerName: row.trainer_name
    }))
  });
}));

module.exports = router;
