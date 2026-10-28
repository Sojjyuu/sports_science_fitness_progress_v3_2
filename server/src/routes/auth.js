const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const { signToken, findAccountByEmail, verifyPassword, requireAuth } = require('../auth');
const { ensurePendingEntitlement, listEntitlements } = require('../entitlements');
const {
  HttpError, asyncRoute, normalizeEmail, isEmail, text, mapUser, mapTrainer, mapEntitlement
} = require('../utils');

const router = express.Router();

/* กันลองรหัสผ่านแบบง่าย ๆ ต่อ IP (20 ครั้ง / 15 นาที) */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
function hitLoginLimit(ip) {
  const now = Date.now();
  /* เก็บกวาดรายการที่หมดเวลาเป็นครั้งคราว กันหน่วยความจำโตไม่จำกัด */
  if (attempts.size > 500) {
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(key);
    }
  }
  const entry = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > MAX_ATTEMPTS;
}
function clearLoginLimit(ip) {
  attempts.delete(ip);
}

async function trainerForAccount(accountId) {
  const { rows } = await db.query('SELECT * FROM trainers WHERE account_id = $1', [accountId]);
  return rows[0] ? mapTrainer(rows[0]) : null;
}

async function sessionPayload(account) {
  const trainer = account.role === 'coach' ? await trainerForAccount(account.id) : null;
  const entitlements = account.role === 'member' ? await listEntitlements(account.id) : [];
  return {
    token: signToken(account, trainer?.id || null),
    user: {
      ...mapUser(account),
      trainer,
      entitlements: entitlements.map(mapEntitlement)
    }
  };
}

router.post('/register', asyncRoute(async (req, res) => {
  const fullName = text(req.body.fullName);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const studentId = text(req.body.studentId);
  const phone = text(req.body.phone);
  const serviceType = req.body.serviceType === 'trainer' ? 'trainer' : 'fitness';
  const plan = req.body.plan ? text(req.body.plan) : null;
  const trainerPackage = req.body.trainerPackage ? text(req.body.trainerPackage) : null;
  const selectedTrainerId = req.body.selectedTrainerId ? text(req.body.selectedTrainerId) : null;

  if (fullName.length < 2) throw new HttpError(400, 'กรุณากรอกชื่อ-นามสกุลให้ครบ');
  if (!isEmail(email)) throw new HttpError(400, 'รูปแบบอีเมลไม่ถูกต้อง');
  if (password.length < 6) throw new HttpError(400, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if (!phone) throw new HttpError(400, 'กรุณากรอกเบอร์ติดต่อ');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    if (plan) {
      const check = await client.query('SELECT 1 FROM fitness_packages WHERE id = $1', [plan]);
      if (!check.rowCount) throw new HttpError(400, 'ไม่พบแพ็กเกจฟิตเนสที่เลือก');
    }
    if (trainerPackage) {
      const check = await client.query('SELECT 1 FROM trainer_packages WHERE id = $1', [trainerPackage]);
      if (!check.rowCount) throw new HttpError(400, 'ไม่พบแพ็กเกจเทรนเนอร์ที่เลือก');
    }
    if (selectedTrainerId) {
      const check = await client.query('SELECT 1 FROM trainers WHERE id = $1 AND active = true', [selectedTrainerId]);
      if (!check.rowCount) throw new HttpError(400, 'ไม่พบเทรนเนอร์ที่เลือก');
    }

    const hash = await bcrypt.hash(password, 10);
    let account;
    try {
      const inserted = await client.query(
        `INSERT INTO accounts (email, password_hash, role, full_name, student_id, phone,
           selected_trainer_id, fitness_package_id, trainer_package_id)
         VALUES ($1, $2, 'member', $3, $4, $5, $6, $7, $8) RETURNING *`,
        [email, hash, fullName, studentId || null, phone, selectedTrainerId, plan, trainerPackage]
      );
      account = inserted.rows[0];
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'อีเมลนี้ถูกสมัครสมาชิกไว้แล้ว');
      throw error;
    }

    if (plan) await ensurePendingEntitlement(client, account.id, 'fitness', plan);
    if (trainerPackage && selectedTrainerId) {
      await ensurePendingEntitlement(client, account.id, 'trainer', trainerPackage);
    }

    await client.query('COMMIT');
    res.status(201).json({ user: mapUser(account), message: 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}));

router.post('/login', asyncRoute(async (req, res) => {
  const ip = req.ip || 'unknown';
  if (hitLoginLimit(ip)) throw new HttpError(429, 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง');

  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!email || !password) throw new HttpError(400, 'กรุณากรอกอีเมลและรหัสผ่าน');

  const account = await findAccountByEmail(email);
  if (!account || !(await verifyPassword(password, account.password_hash))) {
    throw new HttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
  if (account.status !== 'active') throw new HttpError(403, 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่');

  clearLoginLimit(ip);
  res.json(await sessionPayload(account));
}));

/* สร้าง/ดึงบัญชีสมาชิกจากข้อมูล Google แล้วคืน session จริง (JWT) */
async function googleSession({ email, name }) {
  const normalized = normalizeEmail(email);
  if (!isEmail(normalized)) throw new HttpError(400, 'บัญชี Google ไม่มีอีเมลที่ใช้งานได้');

  let account = await findAccountByEmail(normalized);
  if (!account) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const fullName = text(name) || normalized.split('@')[0];
    try {
      const inserted = await db.query(
        `INSERT INTO accounts (email, password_hash, role, full_name)
         VALUES ($1, $2, 'member', $3) RETURNING *`,
        [normalized, passwordHash, fullName]
      );
      account = inserted.rows[0];
    } catch (error) {
      if (error.code !== '23505') throw error;
      account = await findAccountByEmail(normalized);
    }
  }

  if (!account) throw new HttpError(500, 'ไม่สามารถสร้างบัญชีจาก Google ได้');
  if (account.status !== 'active') throw new HttpError(403, 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่');
  return sessionPayload(account);
}

/* เข้าสู่ระบบด้วย Google ID token — ตรวจ token กับ Google ฝั่งเซิร์ฟเวอร์ก่อนออก JWT */
router.post('/google', asyncRoute(async (req, res) => {
  const credential = text(req.body.credential);
  if (!credential) throw new HttpError(400, 'ไม่พบข้อมูลยืนยันจาก Google');
  if (!config.googleClientId) {
    throw new HttpError(503, 'ระบบยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID สำหรับตรวจสอบบัญชี Google');
  }

  let profile;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    profile = await response.json();
    if (!response.ok) throw new Error('invalid token');
  } catch {
    throw new HttpError(401, 'ไม่สามารถยืนยันบัญชี Google ได้ กรุณาลองใหม่');
  }

  const verifiedEmail = profile.email_verified === true || profile.email_verified === 'true';
  const notExpired = Number(profile.exp) * 1000 > Date.now();
  if (profile.aud !== config.googleClientId || !verifiedEmail || !notExpired) {
    throw new HttpError(401, 'ข้อมูลยืนยันจาก Google ไม่ถูกต้องหรือหมดอายุ');
  }

  res.json(await googleSession({ email: profile.email, name: profile.name }));
}));

/* โหมดสาธิตสำหรับเครื่องที่ยังไม่ได้ตั้งค่า Google Client ID (ปิดบน production) */
router.post('/google/demo', asyncRoute(async (req, res) => {
  if (config.env === 'production') throw new HttpError(404, 'ไม่พบ API ที่ร้องขอ');
  res.json(await googleSession({
    email: 'google.demo@sportscience.local',
    name: 'สมาชิก Google Demo'
  }));
}));

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const trainer = req.user.role === 'coach' ? await trainerForAccount(req.user.id) : null;
  const entitlements = req.user.role === 'member' ? await listEntitlements(req.user.id) : [];
  res.json({
    user: {
      ...mapUser(req.user),
      trainer,
      entitlements: entitlements.map(mapEntitlement)
    }
  });
}));

module.exports = router;
