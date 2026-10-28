const { Pool, types } = require('pg');
const config = require('./config');

/* ส่ง date/time กลับเป็นสตริงตรงกับที่เก็บในฐานข้อมูล ลดปัญหา timezone เลื่อนวัน */
types.setTypeParser(1082, value => value); // date
types.setTypeParser(1083, value => value); // time
types.setTypeParser(1114, value => value); // timestamp without time zone

const pool = new Pool(config.database);

pool.on('error', error => {
  console.error('PostgreSQL pool error:', error.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
