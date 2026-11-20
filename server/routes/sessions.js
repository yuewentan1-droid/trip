const r = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { ok, err, sealed } = require('../util');

const chars = s => [...String(s)].length;

r.use(auth);

async function load(req, res) {
  const [rows] = await db.query('SELECT * FROM sessions WHERE id=? AND user_id=?', [req.params.id, req.uid]);
  const s = rows[0];
  if (!s) err(res, '没找到这块地', 404);
  return s || null;
}

r.get('/', async (req, res) => {
  const [rows] = await db.query(
    `SELECT s.*, IFNULL((SELECT MAX(created_at) FROM thoughts WHERE session_id=s.id), s.started_at) AS last_at,
            CAST((SELECT IFNULL(SUM(CHAR_LENGTH(content)), 0) FROM thoughts WHERE session_id=s.id) AS SIGNED) AS words
     FROM sessions s WHERE s.user_id=? ORDER BY last_at DESC, s.id DESC`, [req.uid]);
  ok(res, rows);
});

r.post('/', async (req, res) => {
  const [t] = await db.query(
    'SELECT * FROM topics WHERE id=? AND (user_id IS NULL OR user_id=?)',
    [req.body.topic_id, req.uid]);
  if (!t[0]) return err(res, '这块地不存在');
  const title = String(req.body.title || '').trim();
  const question = String(req.body.question || '').trim();
  if (!title) return err(res, '总得给这块地起个名');
  if (chars(title) > 10) return err(res, '题名最多十个字');
  if (chars(question) > 500) return err(res, '这一层装不下了，再落一层');
  const [ret] = await db.query(
    'INSERT INTO sessions (user_id, topic_id, topic_name, title, question) VALUES (?,?,?,?,?)',
    [req.uid, t[0].id, t[0].name, title, question]);
  const [rows] = await db.query('SELECT * FROM sessions WHERE id=?', [ret.insertId]);
  ok(res, rows[0]);
});

r.get('/:id', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  const [thoughts] = await db.query('SELECT * FROM thoughts WHERE session_id=? ORDER BY id', [s.id]);
  const [miles] = await db.query('SELECT * FROM milestones WHERE session_id=? ORDER BY id DESC', [s.id]);
  ok(res, { session: s, thoughts, milestones: miles });
});

r.put('/:id', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status === 'finished') return sealed(res);
  const title = String(req.body.title || '').trim();
  const question = String(req.body.question || '').trim();
  if (!title) return err(res, '总得给这块地起个名');
  if (chars(title) > 10) return err(res, '题名最多十个字');
  if (chars(question) > 500) return err(res, '这一层装不下了，再落一层');
  await db.query('UPDATE sessions SET title=?, question=? WHERE id=?', [title, question, s.id]);
  ok(res);
});

r.delete('/:id', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  await db.query('DELETE FROM thoughts WHERE session_id=?', [s.id]);
  await db.query('DELETE FROM milestones WHERE session_id=?', [s.id]);
  await db.query('DELETE FROM knock_plots WHERE session_id=?', [s.id]);
  await db.query('DELETE FROM sessions WHERE id=?', [s.id]);
  ok(res);
});

r.post('/:id/finish', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status === 'finished') return err(res, '这块早就封存过了');
  // 封存时挂在树上、种在地上，或交给风；挂在树上还要挑一根枝
  const placement = ['tree', 'ground', 'wind'].includes(req.body.placement) ? req.body.placement : 'tree';
  const n = Number(req.body.branch);
  const branch = placement === 'tree' && Number.isInteger(n) && n >= 0 && n < 12 ? n : null;
  await db.query("UPDATE sessions SET status='finished', placement=?, branch=?, ended_at=NOW() WHERE id=?",
    [placement, branch, s.id]);
  ok(res, { placement, branch }, '这块地封存了');
});

r.post('/:id/thoughts', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status === 'finished') return sealed(res);
  const { dimension } = req.body;
  const content = String(req.body.content || '').trim();
  if (!content) return err(res, '总得写点什么');
  if (chars(content) > 500) return err(res, '这一层装不下了，再落一层');
  const count = s.thought_count + 1;
  const level = Math.floor(count / 3) + 1;
  const [ret] = await db.query('INSERT INTO thoughts (session_id, dimension, content, level) VALUES (?,?,?,?)',
    [s.id, dimension, content, level]);
  await db.query('UPDATE sessions SET thought_count=?, level=? WHERE id=?', [count, level, s.id]);
  const [rows] = await db.query('SELECT * FROM thoughts WHERE id=?', [ret.insertId]);
  const levelUp = level > s.level;
  // 每跨过 3 的倍数层就递一礼，礼的阶梯由层数除 3 定；到顶之后前端转「共生季」
  const reward = levelUp && level % 3 === 0;
  ok(res, { thought: rows[0], level, levelUp, reward, stage: reward ? level / 3 : 0 });
});

r.get('/:id/milestones', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  const [rows] = await db.query('SELECT * FROM milestones WHERE session_id=? ORDER BY id DESC', [s.id]);
  ok(res, rows);
});

r.post('/:id/milestones', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status === 'finished') return sealed(res);
  const [thoughts] = await db.query(
    'SELECT id, dimension, content, level, created_at FROM thoughts WHERE session_id=? ORDER BY id', [s.id]);
  let title = String(req.body.title || '').trim();
  if (chars(title) > 10) return err(res, '题名最多十个字');
  if (!title) {
    const cnt = {};
    thoughts.forEach(t => { cnt[t.dimension] = (cnt[t.dimension] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    title = top ? `第 ${s.level} 层 · ${top[0]}` : `第 ${s.level} 层`;
    title = [...title].slice(0, 10).join('');
  }
  const note = String(req.body.note || '').trim();
  if (chars(note) > 500) return err(res, '这一层装不下了，再落一层');
  const snapshot = JSON.stringify({ level: s.level, thought_count: s.thought_count, thoughts });
  const [ret] = await db.query('INSERT INTO milestones (session_id, level, title, note, snapshot) VALUES (?,?,?,?,?)',
    [s.id, s.level, title, note, snapshot]);
  const [rows] = await db.query('SELECT * FROM milestones WHERE id=?', [ret.insertId]);
  ok(res, rows[0]);
});

module.exports = r;
