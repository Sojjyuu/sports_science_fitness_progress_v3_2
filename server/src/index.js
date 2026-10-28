const path = require('path');
const express = require('express');
const config = require('./config');
const db = require('./db');
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const memberRoutes = require('./routes/member');
const coachRoutes = require('./routes/coach');
const adminRoutes = require('./routes/admin');

const app = express();
const ROOT = path.join(__dirname, '..', '..');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

/* Dev convenience: เปิดให้เรียก API จากคนละพอร์ตได้ (production ควรจำกัด origin) */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, database: 'up', time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'down', message: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/me', memberRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: { message: 'ไม่พบ API ที่ร้องขอ' } });
});

/* เสิร์ฟหน้าเว็บเดิมจาก root ของโปรเจกต์ (same origin กับ API) */
app.use(express.static(ROOT, { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(ROOT, 'index.html'));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error('API error:', error);
  res.status(status).json({
    error: {
      message: status >= 500 ? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' : error.message,
      code: error.code || undefined
    }
  });
});

const server = app.listen(config.port, async () => {
  console.log(`SSF backend พร้อมใช้งานที่ http://localhost:${config.port}`);
  console.log(`Static frontend: ${ROOT}`);
  try {
    await db.query('SELECT 1');
    console.log(`เชื่อมต่อ PostgreSQL ${config.database.database}@${config.database.host}:${config.database.port} สำเร็จ`);
  } catch (error) {
    console.error('เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', error.message);
    console.error('ตรวจสอบว่าได้รัน npm run db:setup แล้ว');
  }
});

const shutdown = async signal => {
  console.log(`\nได้รับ ${signal} กำลังปิดเซิร์ฟเวอร์...`);
  server.close(async () => {
    await db.pool.end().catch(() => {});
    process.exit(0);
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
