const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'dev-only-insecure-secret';

if (env === 'production' && (jwtSecret === 'dev-only-insecure-secret' || jwtSecret.length < 32)) {
  throw new Error('ต้องตั้งค่า JWT_SECRET ที่ปลอดภัย (อย่างน้อย 32 ตัวอักษร) ก่อนรันบน production');
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  env,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  database: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '1234',
    database: process.env.PGDATABASE || 'sports_science_fitness'
  }
};
