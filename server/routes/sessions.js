const r = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { ok, err, sealed } = require('../util');

const chars = s => [...String(s)].length;
const GROUND_CAP = 15, WIND_CAP = 200;
const TREE_MAX = 5;
// 五棵树各有各的地界：主树六十，第二棵三十，第三棵二十，第四棵二十五，第五棵三十
const TREE_CAPS = [60, 30, 20, 25, 30];
const treeLimit = n => TREE_CAPS.slice(0, Math.max(0, Math.min(TREE_MAX, n)))
  .reduce((a, b) => a + b, 0);
const groveCount = (count, extra) => {
  let n = Math.min(TREE_MAX, Math.max(1, (extra || 0) + 1));
  while (n < TREE_MAX && count > treeLimit(n)) n++;
  return n;
};

// 三处都满了就不再硬塞：新封的地先收进我的田地，等腾出地方再种
async function areaFull(uid) {
  const [[{ tree }]] = await db.query(
    "SELECT CAST(COUNT(*) AS SIGNED) tree FROM sessions WHERE user_id=? AND status='finished' AND placement='tree'", [uid]);
  const [[{ wind }]] = await db.query(
    "SELECT CAST(COUNT(*) AS SIGNED) wind FROM sessions WHERE user_id=? AND status='finished' AND placement='wind'", [uid]);
  const [[{ running }]] = await db.query(
    `SELECT CAST(COUNT(*) AS SIGNED) running FROM sessions
     WHERE user_id=? AND (status='running' OR placement='tree' OR placement IS NULL)`, [uid]);
  const [[u]] = await db.query('SELECT extra_trees FROM users WHERE id=?', [uid]);
  // 一棵树都没种的时候，五条树根下的土埂都留出来，地上能落七十五棵
  const roots = running ? groveCount(running, u?.extra_trees) : TREE_MAX;
  const [rows] = await db.query(
    `SELECT branch, CAST(COUNT(*) AS SIGNED) n FROM sessions
     WHERE user_id=? AND placement='ground' GROUP BY branch`, [uid]);
  const used = Array(roots).fill(0);
  rows.forEach(r => {
    const i = Number.isInteger(r.branch) && r.branch >= 0 && r.branch < roots ? r.branch : 0;
    used[i] += r.n;
  });
  return {
    tree: tree >= treeLimit(TREE_MAX),
    ground: Math.min(...used) >= GROUND_CAP,
    wind: wind >= WIND_CAP
  };
}

// 地上长的分回树根：挑当前最空的一条，五条都满了十五就再也种不下
async function groundRoot(uid) {
  const [[u]] = await db.query('SELECT extra_trees FROM users WHERE id=?', [uid]);
  const [[{ n }]] = await db.query(
    `SELECT CAST(COUNT(*) AS SIGNED) n FROM sessions
     WHERE user_id=? AND (status='running' OR placement='tree' OR placement IS NULL)`, [uid]);
  const roots = n ? groveCount(n, u?.extra_trees) : TREE_MAX;
  const [rows] = await db.query(
    `SELECT branch, CAST(COUNT(*) AS SIGNED) n FROM sessions
     WHERE user_id=? AND placement='ground' GROUP BY branch`, [uid]);
  const used = Array(roots).fill(0);
  rows.forEach(r => {
    const i = Number.isInteger(r.branch) && r.branch >= 0 && r.branch < roots ? r.branch : 0;
    used[i] += r.n;
  });
  const low = Math.min(...used);
  return low >= GROUND_CAP ? null : used.indexOf(low);
}

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
            EXISTS(SELECT 1 FROM thoughts WHERE session_id=s.id AND img <> '') AS has_img,
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
  await db.query('DELETE FROM session_keeps WHERE session_id=?', [s.id]);
  await db.query('DELETE FROM sessions WHERE id=?', [s.id]);
  ok(res);
});

// 看完了，把这棵收进自己的田里；树上地上风里都撤下来，字一封不动
r.post('/:id/pick', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status !== 'finished') return err(res, '这块地还没封，先封了再采');
  await db.query("UPDATE sessions SET placement='picked', branch=NULL WHERE id=?", [s.id]);
  ok(res, { placement: 'picked' }, '收回田里了');
});

// 采回来的叶子再挑个地方种回去：挂树、落地、交给风，仍旧守着各处的数
r.post('/:id/place', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status !== 'finished') return err(res, '这块地还没封，先封了再摆');
  const placement = ['tree', 'ground', 'wind'].includes(req.body.placement) ? req.body.placement : '';
  if (!placement) return err(res, '挑个地方再种');
  let branch = null;
  if (placement === 'tree') {
    const [[{ n }]] = await db.query(
      "SELECT CAST(COUNT(*) AS SIGNED) n FROM sessions WHERE user_id=? AND status='finished' AND placement='tree'", [s.user_id]);
    if (n >= treeLimit(TREE_MAX)) return err(res, '树上已经挂满了');
  }
  if (placement === 'ground') {
    branch = await groundRoot(s.user_id);
    if (branch === null) return err(res, '每个树根下最多十五棵，都满了');
  }
  if (placement === 'wind') {
    const [[{ n }]] = await db.query(
      "SELECT CAST(COUNT(*) AS SIGNED) n FROM sessions WHERE user_id=? AND placement='wind'", [s.user_id]);
    if (n >= WIND_CAP) return err(res, '风里最多留 200 片，已经满了');
  }
  await db.query('UPDATE sessions SET placement=?, branch=?, ended_at=NOW() WHERE id=?', [placement, branch, s.id]);
  ok(res, { placement, branch }, '又种回去了');
});

r.post('/:id/finish', async (req, res) => {
  const s = await load(req, res); if (!s) return;
  if (s.status === 'finished') return err(res, '这块早就封存过了');
  const full = await areaFull(s.user_id);
  // 三处都满了也照样能封：先收在田埂上，回头到「我的田地」里再挑地方种
  if (full.tree && full.ground && full.wind) {
    await db.query(
      "UPDATE sessions SET status='finished', placement='held', branch=NULL, ended_at=NOW() WHERE id=?", [s.id]);
    return ok(res, { placement: 'held', branch: null }, '三处都满了，先替你收进我的田地');
  }
  // 封存时挂在树上、种在地上，或交给风；挂在树上还要挑一根枝
  const placement = ['tree', 'ground', 'wind'].includes(req.body.placement) ? req.body.placement : 'tree';
  if (placement === 'tree' && full.tree) return err(res, '树上已经挂满了，换地上或风里吧');
  if (placement === 'ground' && full.ground) return err(res, '每个树根下最多十五棵，都满了');
  if (placement === 'wind' && full.wind) return err(res, '风里最多留 200 片，已经满了');
  const n = Number(req.body.branch);
  let branch = placement === 'tree' && Number.isInteger(n) && n >= 0 && n < 14 ? n : null;
  if (placement === 'ground') branch = await groundRoot(s.user_id);
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
  const [ret] = await db.query(
    'INSERT INTO thoughts (session_id, dimension, content, level, img) VALUES (?,?,?,?,?)',
    [s.id, dimension, content, level, req.body.img || '']);
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
  if (chars(note) > 30) return err(res, '这句话最多三十个字');
  const snapshot = JSON.stringify({ level: s.level, thought_count: s.thought_count, thoughts });
  const [ret] = await db.query('INSERT INTO milestones (session_id, level, title, note, snapshot) VALUES (?,?,?,?,?)',
    [s.id, s.level, title, note, snapshot]);
  const [rows] = await db.query('SELECT * FROM milestones WHERE id=?', [ret.insertId]);
  ok(res, rows[0]);
});

module.exports = r;
