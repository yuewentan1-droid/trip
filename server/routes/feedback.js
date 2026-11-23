const r = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { WALL } = require('../official');
const { ok, err } = require('../util');

const chars = s => [...String(s)].length;

r.post('/', auth, async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) return err(res, '还没写呢');
  if (chars(content) > 300) return err(res, '写短一点，三百字以内');
  const [rows] = await db.query('SELECT id FROM users WHERE username=?', [WALL]);
  const wall = rows[0];
  if (!wall) return err(res, '意见墙还没搭好，过会儿再来');
  if (wall.id === req.uid) return err(res, '这是你自己的意见墙');
  const [[{ n }]] = await db.query(
    `SELECT CAST(COUNT(*) AS SIGNED) n FROM messages
     WHERE garden_user_id=? AND from_user_id=? AND created_at >= CURDATE()`, [wall.id, req.uid]);
  if (n >= 3) return err(res, '今天写得够多了，明天再来');
  await db.query(
    'INSERT INTO messages (garden_user_id, from_user_id, content) VALUES (?,?,?)',
    [wall.id, req.uid, content]);
  ok(res);
});

module.exports = r;
