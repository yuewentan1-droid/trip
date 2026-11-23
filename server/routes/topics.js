const r = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { ok, err } = require('../util');

const chars = s => [...String(s)].length;

r.use(auth);

r.get('/', async (req, res) => {
  const cat = req.query.category ? 'AND category=?' : '';
  const args = req.query.category ? [req.uid, req.query.category] : [req.uid];
  const [rows] = await db.query(
    `SELECT * FROM topics WHERE (user_id IS NULL OR user_id=?) ${cat} ORDER BY id`, args);
  ok(res, rows);
});

r.post('/', async (req, res) => {
  const { category, icon, img } = req.body;
  const name = String(req.body.name || '').trim();
  const intro = String(req.body.intro || '').trim();
  if (!name) return err(res, '名字总得起一个');
  if (chars(name) > 10) return err(res, '名字最多十个字');
  if (chars(intro) > 30) return err(res, '一句话介绍最多三十个字');
  const [ret] = await db.query(
    'INSERT INTO topics (user_id, category, name, icon, intro, img) VALUES (?,?,?,?,?,?)',
    [req.uid, category, name, icon || 'sprout', intro, img || '']);
  const [rows] = await db.query('SELECT * FROM topics WHERE id=?', [ret.insertId]);
  ok(res, rows[0]);
});

async function mine(req) {
  const [rows] = await db.query('SELECT * FROM topics WHERE id=?', [req.params.id]);
  const t = rows[0];
  return t && t.user_id === req.uid ? t : null;
}

r.put('/:id', async (req, res) => {
  if (!await mine(req)) return err(res, '系统给的那几块，动不了');
  const name = String(req.body.name || '').trim();
  const intro = String(req.body.intro || '').trim();
  if (!name) return err(res, '名字总得起一个');
  if (chars(name) > 10) return err(res, '名字最多十个字');
  if (chars(intro) > 30) return err(res, '一句话介绍最多三十个字');
  const { icon, img } = req.body;
  await db.query('UPDATE topics SET name=?, icon=?, intro=?, img=? WHERE id=?',
    [name, icon, intro, img || '', req.params.id]);
  ok(res);
});

r.delete('/:id', async (req, res) => {
  if (!await mine(req)) return err(res, '系统给的那几块，动不了');
  await db.query('DELETE FROM topics WHERE id=?', [req.params.id]);
  ok(res);
});

module.exports = r;
