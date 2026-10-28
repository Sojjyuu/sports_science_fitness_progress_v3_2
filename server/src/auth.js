const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');
const db = require('./db');
const { HttpError, normalizeEmail } = require('./utils');

async function findAccountByEmail(email) {
  const { rows } = await db.query('SELECT * FROM accounts WHERE lower(email) = lower($1)', [normalizeEmail(email)]);
  return rows[0] || null;
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(String(plain || ''), hash);
}

function signToken(account, trainerId = null) {
  return jwt.sign(
    { sub: account.id, role: account.role, trainerId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/* ตรวจ JWT แล้วโหลดบัญชีล่าสุดจากฐานข้อมูลทุกครั้ง (role/สถานะเปลี่ยนมีผลทันที) */
async function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new HttpError(401, 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    }

    const { rows } = await db.query('SELECT * FROM accounts WHERE id = $1', [payload.sub]);
    const account = rows[0];
    if (!account) throw new HttpError(401, 'ไม่พบบัญชีผู้ใช้');
    if (account.status !== 'active') throw new HttpError(403, 'บัญชีนี้ถูกระงับการใช้งาน');

    req.user = account;
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'กรุณาเข้าสู่ระบบ'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'บทบาทนี้ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้'));
    next();
  };
}

module.exports = {
  findAccountByEmail,
  verifyPassword,
  signToken,
  requireAuth,
  requireRole
};
