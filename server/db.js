const db = require('mysql2/promise');
module.exports = db.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'deep_thinking',
  charset: 'utf8mb4',
  connectionLimit: 8, dateStrings: true
});
