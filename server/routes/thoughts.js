const r = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { ok, err, sealed } = require('../util');

const chars = s => [...String(s)].length;

r.use(auth);

async function mine(req, res) {
  const [rows] = await db.query(
    `SELECT t.*, s.user_id AS uid, s.status FROM thoughts t JOIN sessions s ON s.id=t.session_id WHERE t.id=?`,
    [req.params.id]);
  const t = rows[0];
  if (!t || t.uid !== req.uid) { err(res, '没这条想法', 404); return null; }
  return t;
}

async function ctx(req, res) {
  const t = await mine(req, res); if (!t) return null;
  if (t.status === 'finished') { sealed(res); return null; }
  return t;
}

// 这一滴给不给外人看；封了地也还能改，只是把字从别人院里收回来
r.put('/:id/visible', async (req, res) => {
  const t = await mine(req, res); if (!t) return;
  const visible = req.body.visible ? 1 : 0;
  await db.query('UPDATE thoughts SET visible=? WHERE id=?', [visible, t.id]);
  ok(res, { visible }, visible ? '放回院里了' : '收起来了，只有你看得到');
});

r.put('/:id', async (req, res) => {
  const t = await ctx(req, res); if (!t) return;
  const content = String(req.body.content || '').trim();
  if (!content) return err(res, '总得写点什么');
  if (chars(content) > 500) return err(res, '这一层装不下了，再落一层');
  const img = req.body.img === undefined ? t.img : String(req.body.img || '');
  await db.query('UPDATE thoughts SET dimension=?, content=?, img=? WHERE id=?',
    [req.body.dimension, content, img, t.id]);
  ok(res);
});

r.delete('/:id', async (req, res) => {
  const t = await ctx(req, res); if (!t) return;
  await db.query('DELETE FROM thoughts WHERE id=?', [t.id]);
  const [[{ c }]] = await db.query('SELECT COUNT(*) c FROM thoughts WHERE session_id=?', [t.session_id]);
  await db.query('UPDATE sessions SET thought_count=?, level=? WHERE id=?',
    [c, Math.floor(c / 3) + 1, t.session_id]);
  ok(res);
});

module.exports = r;
