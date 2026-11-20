const r = require('express').Router();
const db = require('../db');
const { auth, maybe } = require('../auth');
const { ok, err } = require('../util');

const titleOf = u => u.garden_name || `${u.nickname || '某个人'}的地`;
const PAGE = 10;
const MSG = 4;
const chars = s => [...String(s)].length;

const messageSql = `SELECT m.id, m.from_user_id, m.content, m.reply, m.replied_at, m.created_at, u.nickname
  FROM messages m JOIN users u ON u.id=m.from_user_id`;

// 敞着门的地谁都能看；围起来的，只有主人，或者敲过门被放进来的人能看
async function inside(req) {
  const [rows] = await db.query(
    'SELECT id, nickname, garden_name, bio, visibility FROM users WHERE id=?', [req.params.id]);
  const g = rows[0];
  if (!g) return { g: null, mode: null };
  if (g.visibility === 'public') return { g, mode: 'public' };
  if (g.id === req.uid) return { g, mode: 'owner' };
  if (!req.uid) return { g, mode: null };
  const [k] = await db.query(
    `SELECT id FROM knocks WHERE garden_user_id=? AND visitor_id=? AND status='approved'
     ORDER BY id DESC LIMIT 1`, [g.id, req.uid]);
  return k[0] ? { g, mode: 'knock', knock: k[0].id } : { g, mode: null };
}

async function knockState(id, uid) {
  if (!uid) return null;
  const [rows] = await db.query(
    'SELECT status FROM knocks WHERE garden_user_id=? AND visitor_id=? ORDER BY id DESC LIMIT 1', [id, uid]);
  return rows[0] ? rows[0].status : null;
}

const gardenCard = g => g && {
  id: g.id, nickname: g.nickname, garden_name: titleOf(g), bio: g.bio, visibility: g.visibility
};

async function fenced(req, res, g) {
  const knock = g ? await knockState(g.id, req.uid) : null;
  res.json({ code: 403, msg: '这块地围起来了', data: { knock, garden: gardenCard(g) } });
}

// 串门：十块地一页，敞着门的进院，围着门的敲一敲
r.get('/visits', async (req, res) => {
  const sort = ['recent', 'high'].includes(req.query.sort) ? req.query.sort : 'all';
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE;
  const recent = sort === 'recent';
  const where = recent ? 'EXISTS (SELECT 1 FROM messages m WHERE m.garden_user_id=u.id)' : '1=1';
  const order = sort === 'high'
    ? 'top_level DESC, seed_count DESC, u.views DESC, u.id DESC'
    : recent
      ? 'last_message_at DESC, u.views DESC, u.id DESC'
      : 'u.views DESC, message_count DESC, COALESCE(u.published_at, u.created_at) DESC, u.id DESC';

  const [list] = await db.query(
    `SELECT u.id, u.nickname, u.garden_name, u.bio, u.visibility, u.published_at,
       (SELECT CAST(COUNT(*) AS SIGNED) FROM sessions s WHERE s.user_id=u.id) AS seed_count,
       (SELECT CAST(IFNULL(MAX(s.level), 0) AS SIGNED) FROM sessions s WHERE s.user_id=u.id) AS top_level,
       (SELECT MAX(m.created_at) FROM messages m WHERE m.garden_user_id=u.id) AS last_message_at,
       (SELECT CAST(COUNT(*) AS SIGNED) FROM messages m WHERE m.garden_user_id=u.id) AS message_count,
       (SELECT s.title FROM sessions s WHERE s.user_id=u.id ORDER BY s.id DESC LIMIT 1) AS latest_title,
       (SELECT s.question FROM sessions s WHERE s.user_id=u.id ORDER BY s.id DESC LIMIT 1) AS latest_question
     FROM users u WHERE ${where}
     ORDER BY ${order} LIMIT ? OFFSET ?`, [PAGE, offset]);
  const [[{ total }]] = await db.query(`SELECT CAST(COUNT(*) AS SIGNED) AS total FROM users u WHERE ${where}`);

  ok(res, {
    list: list.map(u => {
      const open = u.visibility === 'public';
      return {
        id: u.id, nickname: u.nickname, garden_name: titleOf(u), bio: u.bio,
        visibility: u.visibility, fenced: !open,
        seed_count: open ? u.seed_count : null, top_level: open ? u.top_level : null,
        message_count: u.message_count, last_message_at: u.last_message_at,
        latest_seed: open ? (u.latest_question || u.latest_title || '') : ''
      };
    }),
    total, page, limit: PAGE, sort
  });
});

// 走进一块地：树、种子，和篱笆外最近的几句话
r.get('/garden/:id', maybe, async (req, res) => {
  const { g, mode, knock } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (g.id !== req.uid) await db.query('UPDATE users SET views=views+1 WHERE id=?', [g.id]);

  let sql = `SELECT id, topic_name, title, question, level, thought_count, status, placement, branch,
    started_at, ended_at FROM sessions WHERE user_id=?`;
  const args = [g.id];
  if (mode === 'knock') {
    sql += ' AND id IN (SELECT session_id FROM knock_plots WHERE knock_id=?)';
    args.push(knock);
  }
  const [sessions] = await db.query(sql + ' ORDER BY id', args);

  let messages = [], total = 0;
  if (mode === 'public' || mode === 'owner') {
    const [list] = await db.query(
      `${messageSql} WHERE m.garden_user_id=? ORDER BY m.id DESC LIMIT ?`, [g.id, MSG]);
    messages = list;
    [[{ total }]] = await db.query(
      'SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages WHERE garden_user_id=?', [g.id]);
  }

  ok(res, {
    garden: { ...g, garden_name: titleOf(g) },
    sessions: sessions.map(s => ({ ...s, peek: s.question || s.title })),
    messages, message_total: total, mode
  });
});

// 串门的人点开树上一片叶子：只看这一块地写过什么，不能改也不能删
r.get('/garden/:id/session/:sid', maybe, async (req, res) => {
  const { g, mode, knock } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  let sql = 'SELECT * FROM sessions WHERE id=? AND user_id=?';
  const args = [req.params.sid, g.id];
  if (mode === 'knock') {
    sql += ' AND id IN (SELECT session_id FROM knock_plots WHERE knock_id=?)';
    args.push(knock);
  }
  const [rows] = await db.query(sql, args);
  if (!rows[0]) return err(res, '没找到这块地', 404);
  const [thoughts] = await db.query(
    'SELECT id, dimension, content, level, created_at FROM thoughts WHERE session_id=? ORDER BY id', [rows[0].id]);
  const [milestones] = await db.query(
    'SELECT * FROM milestones WHERE session_id=? ORDER BY id DESC', [rows[0].id]);
  ok(res, { session: rows[0], thoughts, milestones });
});

// 篱笆外的话，一页四句，摊三列
r.get('/garden/:id/messages', maybe, async (req, res) => {
  const { g, mode } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (mode === 'knock') return err(res, '主人只开了几块地给你看');
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * MSG;
  const [list] = await db.query(
    `${messageSql} WHERE m.garden_user_id=? ORDER BY m.id DESC LIMIT ? OFFSET ?`, [g.id, MSG, offset]);
  const [[{ total }]] = await db.query(
    'SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages WHERE garden_user_id=?', [g.id]);
  ok(res, { list, total, page, limit: MSG });
});

// 留一句话：对同一块地一天最多三句；围起来的地要敲过门、被放进来才能看，不能留话
r.post('/garden/:id/messages', auth, async (req, res) => {
  const { g, mode } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (g.id === req.uid) return err(res, '自己的地，看看就好');
  if (mode !== 'public') return err(res, '主人开了门给你看，没说能留话');
  const content = String(req.body.content || '').trim();
  if (!content) return err(res, '总得写点什么');
  if (chars(content) > 200) return err(res, '话太长了，收一收');
  const [[{ n }]] = await db.query(
    `SELECT CAST(COUNT(*) AS SIGNED) AS n FROM messages
     WHERE garden_user_id=? AND from_user_id=? AND created_at >= CURDATE()`, [g.id, req.uid]);
  if (n >= 3) return res.json({ code: 429, msg: '今天说得够多了，明天再来' });
  const [ret] = await db.query(
    'INSERT INTO messages (garden_user_id, from_user_id, content) VALUES (?,?,?)',
    [g.id, req.uid, content]);
  const [[m], [me]] = await Promise.all([
    db.query('SELECT id, from_user_id, content, reply, replied_at, created_at FROM messages WHERE id=?', [ret.insertId]),
    db.query('SELECT nickname FROM users WHERE id=?', [req.uid])
  ]);
  ok(res, { ...m[0], nickname: me[0].nickname });
});

// 主人在自己的留言篱笆上回一句
r.put('/messages/:id/reply', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM messages WHERE id=?', [req.params.id]);
  const m = rows[0];
  if (!m || m.garden_user_id !== req.uid) return err(res, '这句不在你的篱笆上');
  const reply = String(req.body.reply || '').trim();
  if (!reply) return err(res, '总得回一句');
  if (chars(reply) > 200) return err(res, '话太长了，收一收');
  await db.query('UPDATE messages SET reply=?, replied_at=NOW() WHERE id=?', [reply, m.id]);
  const [back] = await db.query('SELECT reply, replied_at FROM messages WHERE id=?', [m.id]);
  ok(res, back[0]);
});

r.delete('/messages/:id', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM messages WHERE id=?', [req.params.id]);
  const m = rows[0];
  if (!m) return err(res, '这句已经没了');
  if (m.from_user_id !== req.uid) return err(res, '这句不是你留的');
  await db.query('DELETE FROM messages WHERE id=?', [m.id]);
  ok(res);
});

// 自己篱笆外的留言：一页四句，按最新排
r.get('/messages/inbox', auth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * MSG;
  const [list] = await db.query(
    `${messageSql} WHERE m.garden_user_id=? ORDER BY m.id DESC LIMIT ? OFFSET ?`, [req.uid, MSG, offset]);
  const [[{ total }]] = await db.query(
    'SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages WHERE garden_user_id=?', [req.uid]);
  ok(res, { list, total, page, limit: MSG });
});

// 我留在别人篱笆上的话：回音也一并带回来
r.get('/messages/outbox', auth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * MSG;
  const [list] = await db.query(
    `SELECT m.id, m.garden_user_id, m.from_user_id, m.content, m.reply, m.replied_at, m.created_at,
       u.nickname, u.garden_name
     FROM messages m JOIN users u ON u.id=m.garden_user_id
     WHERE m.from_user_id=? ORDER BY m.id DESC LIMIT ? OFFSET ?`, [req.uid, MSG, offset]);
  const [[{ total }]] = await db.query(
    'SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages WHERE from_user_id=?', [req.uid]);
  ok(res, {
    list: list.map(m => ({ ...m, garden_name: titleOf(m) })),
    total, page, limit: MSG
  });
});

// 头像旁边那一小撮：自己篱笆上的话、留在别处的话和回音，还有门里门外的动静
r.get('/notices', auth, async (req, res) => {
  const [[box]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE garden_user_id=?) AS messages,
       (SELECT COUNT(*) FROM messages WHERE from_user_id=?) AS sent,
       (SELECT COUNT(*) FROM messages WHERE from_user_id=? AND reply IS NOT NULL) AS replies,
       (SELECT COUNT(*) FROM knocks WHERE garden_user_id=? AND status='pending') AS knocks,
       (SELECT COUNT(*) FROM knocks WHERE visitor_id=? AND status='approved' AND seen_by_visitor=0) AS approvals`,
    [req.uid, req.uid, req.uid, req.uid, req.uid]);
  const [out] = await db.query(
    `SELECT k.status FROM knocks k
     WHERE k.visitor_id=? AND k.status IN ('pending','declined')
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.visitor_id=k.visitor_id AND k2.garden_user_id=k.garden_user_id)`, [req.uid]);
  const waiting = out.filter(k => k.status === 'pending').length;
  const declined = out.filter(k => k.status === 'declined').length;
  const [latest] = await db.query(
    `SELECT m.content, m.created_at, u.nickname FROM messages m JOIN users u ON u.id=m.from_user_id
     WHERE m.garden_user_id=? ORDER BY m.id DESC LIMIT 1`, [req.uid]);
  const [latestReply] = await db.query(
    `SELECT m.reply, m.replied_at, m.content, u.nickname, u.garden_name
     FROM messages m JOIN users u ON u.id=m.garden_user_id
     WHERE m.from_user_id=? AND m.reply IS NOT NULL ORDER BY m.replied_at DESC, m.id DESC LIMIT 1`, [req.uid]);
  const [latestSent] = await db.query(
    `SELECT m.content, m.reply, m.replied_at, m.created_at, u.nickname, u.garden_name
     FROM messages m JOIN users u ON u.id=m.garden_user_id
     WHERE m.from_user_id=? ORDER BY m.id DESC LIMIT 1`, [req.uid]);
  ok(res, {
    ...box, waiting, declined,
    latest: latest[0] || null,
    latest_reply: latestReply[0] ? { ...latestReply[0], garden_name: titleOf(latestReply[0]) } : null,
    latest_sent: latestSent[0] ? { ...latestSent[0], garden_name: titleOf(latestSent[0]) } : null
  });
});

// 敲门的人和被敲的门：主人看进来的，访客看自己敲过的和已经开了的
r.get('/knocks', auth, async (req, res) => {
  const [incoming] = await db.query(
    `SELECT k.id, k.created_at, u.nickname, u.id AS visitor_id
     FROM knocks k JOIN users u ON u.id=k.visitor_id
     WHERE k.garden_user_id=? AND k.status='pending' ORDER BY k.id DESC`, [req.uid]);
  const [opened] = await db.query(
    `SELECT k.id, k.garden_user_id, k.seen_by_visitor, k.created_at,
       u.nickname, u.garden_name,
       (SELECT CAST(COUNT(*) AS SIGNED) FROM knock_plots kp WHERE kp.knock_id=k.id) AS plots
     FROM knocks k JOIN users u ON u.id=k.garden_user_id
     WHERE k.visitor_id=? AND k.status='approved' ORDER BY k.id DESC`, [req.uid]);
  const [out] = await db.query(
    `SELECT k.id, k.garden_user_id, k.status, k.created_at, u.nickname, u.garden_name
     FROM knocks k JOIN users u ON u.id=k.garden_user_id
     WHERE k.visitor_id=? AND k.status IN ('pending','declined')
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.visitor_id=k.visitor_id AND k2.garden_user_id=k.garden_user_id)
     ORDER BY k.id DESC`, [req.uid]);
  const shape = k => ({ ...k, garden_name: titleOf(k) });
  ok(res, {
    incoming,
    opened: opened.map(shape),
    waiting: out.filter(k => k.status === 'pending').map(shape),
    declined: out.filter(k => k.status === 'declined').map(shape)
  });
});

// 敲一扇围起来的门
r.post('/garden/:id/knock', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id=?', [req.params.id]);
  const g = rows[0];
  if (!g) return err(res, '没找到这块地', 404);
  if (g.id === req.uid) return err(res, '自己的地，不用敲门');
  if (g.visibility === 'public') return err(res, '门本来就敞着，直接进吧');
  const [last] = await db.query(
    'SELECT status FROM knocks WHERE garden_user_id=? AND visitor_id=? ORDER BY id DESC LIMIT 1', [g.id, req.uid]);
  if (last[0] && last[0].status === 'pending') return ok(res, { status: 'pending' });
  if (last[0] && last[0].status === 'approved') return ok(res, { status: 'approved' });
  await db.query('INSERT INTO knocks (garden_user_id, visitor_id) VALUES (?,?)', [g.id, req.uid]);
  ok(res, { status: 'pending' });
});

// 主人决定开哪几块地给他看；开了门，敲门的人会在头像边收到回音
r.post('/knocks/:id/decide', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM knocks WHERE id=? AND garden_user_id=?', [req.params.id, req.uid]);
  const k = rows[0];
  if (!k) return err(res, '没这扇门', 404);
  if (k.status !== 'pending') return err(res, '这扇门已经定过了');
  if (!req.body.open) {
    await db.query("UPDATE knocks SET status='declined', decided_at=NOW() WHERE id=?", [k.id]);
    return ok(res, { status: 'declined' });
  }
  const ids = Array.isArray(req.body.sessions)
    ? [...new Set(req.body.sessions.map(Number).filter(Number.isInteger))] : [];
  if (!ids.length) return err(res, '总得开一块地给他看');
  const marks = ids.map(() => '?').join(',');
  const [valid] = await db.query(
    `SELECT id FROM sessions WHERE user_id=? AND id IN (${marks})`, [req.uid, ...ids]);
  if (!valid.length) return err(res, '这几块地不在你的田里');
  await db.query("UPDATE knocks SET status='approved', decided_at=NOW(), seen_by_visitor=0 WHERE id=?", [k.id]);
  await db.query('DELETE FROM knock_plots WHERE knock_id=?', [k.id]);
  await db.query('INSERT INTO knock_plots (knock_id, session_id) VALUES ?',
    [valid.map(v => [k.id, v.id])]);
  ok(res, { status: 'approved', plots: valid.length });
});

r.post('/knocks/:id/seen', auth, async (req, res) => {
  await db.query(
    "UPDATE knocks SET seen_by_visitor=1 WHERE id=? AND visitor_id=? AND status='approved'",
    [req.params.id, req.uid]);
  ok(res);
});

module.exports = r;
