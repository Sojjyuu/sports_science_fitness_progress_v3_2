/* สร้างฐานข้อมูล (ถ้ายังไม่มี) และรัน schema.sql
   ใช้: npm run db:migrate */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '1234'
};
const database = process.env.PGDATABASE || 'sports_science_fitness';

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('PGDATABASE ต้องเป็นตัวอักษร ตัวเลข หรือ _ เท่านั้น');
}

async function ensureDatabase() {
  const client = new Client({ ...config, database: 'postgres' });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!rowCount) {
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`สร้างฐานข้อมูล ${database} แล้ว`);
    } else {
      console.log(`พบฐานข้อมูล ${database} แล้ว`);
    }
  } finally {
    await client.end();
  }
}

async function applySchema() {
  const client = new Client({ ...config, database });
  await client.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(sql);
    console.log('รัน schema สำเร็จ');
  } finally {
    await client.end();
  }
}

(async () => {
  try {
    await ensureDatabase();
    await applySchema();
  } catch (error) {
    console.error('migrate ล้มเหลว:', error.message);
    process.exitCode = 1;
  }
})();
