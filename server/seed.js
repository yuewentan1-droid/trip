// 给部署好的库种上四块官方的田：cd server && npm run seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'deep_thinking',
    charset: 'utf8mb4',
    multipleStatements: true
  });
  await c.query(fs.readFileSync(path.join(__dirname, 'sql/official.sql'), 'utf8'));
  console.log('四块官方的田种好了，密码都是 12345678');
  await c.end();
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
