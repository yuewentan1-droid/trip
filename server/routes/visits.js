const r = require('express').Router();
const db = require('../db');
const { auth, maybe } = require('../auth');
const { ok, err } = require('../util');

const titleOf = u => u.garden_name || `${u.nickname || '某个人'}的地`;
const PAGE = 10;
const MSG = 12;
const chars = s => [...String(s)].length;

const messageSql = `SELECT m.id, m.from_user_id, m.content, m.reply, m.replied_at, m.created_at, u.nickname
  FROM messages m JOIN users u ON u.id=m.from_user_id`;
// 篱笆上找话：按话里的字、回音或来人的名字找，通配符当普通字
const likeArg = q => '%' + String(q).replace(/[!%_]/g, '!$&') + '%';

// 敞着门的地谁都能看；围起来的，只有主人，或者敲过门被放进来的人能看
async function inside(req) {
  const [rows] = await db.query(
    'SELECT id, nickname, garden_name, bio, visibility, extra_trees FROM users WHERE id=?', [req.params.id]);
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
    `SELECT k.status, k.decline_reason,
       (SELECT k2.decline_reason FROM knocks k2
        WHERE k2.garden_user_id=k.garden_user_id AND k2.visitor_id=k.visitor_id
          AND k2.status='declined' ORDER BY k2.id DESC LIMIT 1) AS last_reason
     FROM knocks k WHERE k.garden_user_id=? AND k.visitor_id=?
     ORDER BY k.id DESC LIMIT 1`, [id, uid]);
  return rows[0] || null;
}

const gardenCard = g => g && {
  id: g.id, nickname: g.nickname, garden_name: titleOf(g), bio: g.bio, visibility: g.visibility,
  extra_trees: g.extra_trees || 0
};

async function fenced(req, res, g) {
  const k = g ? await knockState(g.id, req.uid) : null;
  res.json({
    code: 403, msg: '这块地围起来了',
    data: {
      knock: k ? k.status : null,
      knock_reason: k && k.status !== 'approved' ? (k.decline_reason || k.last_reason || '') : '',
      garden: gardenCard(g)
    }
  });
}

// 串门：十块地一页，敞着门的进院，围着门的敲一敲
r.get('/visits', maybe, async (req, res) => {
  const sort = ['recent', 'high'].includes(req.query.sort) ? req.query.sort : 'all';
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE;
  const recent = sort === 'recent';
  const q = String(req.query.q || '').trim().slice(0, 20);
  let where = recent ? 'EXISTS (SELECT 1 FROM messages m WHERE m.garden_user_id=u.id)' : '1=1';
  const args = [];
  if (q) {
    where += " AND (u.nickname LIKE ? ESCAPE '!' OR u.garden_name LIKE ? ESCAPE '!' OR u.bio LIKE ? ESCAPE '!')";
    const like = likeArg(q);
    args.push(like, like, like);
  }
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
     ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, PAGE, offset]);
  const [[{ total }]] = await db.query(
    `SELECT CAST(COUNT(*) AS SIGNED) AS total FROM users u WHERE ${where}`, args);

  // 主人开过门的院子，对这个人已经不算关着；名单里翻到时不装锁
  // 只看每家最后一道门，第一次露脸时说一声，之后只留“院门开着”
  const pageIds = new Set(list.map(u => u.id));
  const [passed] = req.uid ? await db.query(
    `SELECT k.id, k.garden_user_id, k.seen_by_visitor
     FROM knocks k
     WHERE k.visitor_id=? AND k.status='approved'
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.visitor_id=k.visitor_id AND k2.garden_user_id=k.garden_user_id)`,
    [req.uid]) : [[]];
  const opened = new Set(passed.map(k => k.garden_user_id));
  const fresh = passed.filter(k => !k.seen_by_visitor && pageIds.has(k.garden_user_id));
  const freshDoors = new Set(fresh.map(k => k.garden_user_id));
  if (fresh.length) {
    await db.query(
      `UPDATE knocks SET seen_by_visitor=1 WHERE id IN (${fresh.map(() => '?').join(',')})`,
      fresh.map(k => k.id));
  }

  ok(res, {
    list: list.map(u => {
      const open = u.visibility === 'public';
      const inDoor = !open && opened.has(u.id);
      return {
        id: u.id, nickname: u.nickname, garden_name: titleOf(u), bio: u.bio,
        visibility: u.visibility, fenced: !open && !inDoor, opened: inDoor,
        opened_fresh: inDoor && freshDoors.has(u.id),
        seed_count: open ? u.seed_count : null, top_level: open ? u.top_level : null,
        message_count: u.message_count, last_message_at: u.last_message_at,
        latest_seed: open ? (u.latest_question || u.latest_title || '') : ''
      };
    }),
    total, page, limit: PAGE, sort, q
  });
});

// 走进一块地：树、种子，和篱笆外最近的几句话
r.get('/garden/:id', maybe, async (req, res) => {
  const { g, mode, knock } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (g.id !== req.uid) await db.query('UPDATE users SET views=views+1 WHERE id=?', [g.id]);

  let sql = `SELECT id, topic_name, title, question, level, thought_count, status, placement, branch,
    started_at, ended_at FROM sessions WHERE user_id=? AND placement NOT IN ('picked','held')`;
  const args = [g.id];
  if (mode === 'knock') {
    sql += ' AND id IN (SELECT session_id FROM knock_plots WHERE knock_id=?)';
    args.push(knock);
  }
  const [sessions] = await db.query(sql + ' ORDER BY id', args);

  // 别人院里的篱笆只挂今天的话，昨天的落进土里；主人自己看得到全部
  const visitor = g.id !== req.uid;
  let messages = [], total = 0;
  if (mode === 'public' || mode === 'owner') {
    const [list] = await db.query(
      `${messageSql} WHERE m.garden_user_id=?${visitor ? ' AND m.created_at >= CURDATE()' : ''}
       ORDER BY m.id DESC LIMIT ?`, [g.id, MSG]);
    messages = list;
    [[{ total }]] = await db.query(
      `SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages
       WHERE garden_user_id=?${visitor ? ' AND created_at >= CURDATE()' : ''}`, [g.id]);
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
  let sql = "SELECT * FROM sessions WHERE id=? AND user_id=? AND placement NOT IN ('picked','held')";
  const args = [req.params.sid, g.id];
  if (mode === 'knock') {
    sql += ' AND id IN (SELECT session_id FROM knock_plots WHERE knock_id=?)';
    args.push(knock);
  }
  const [rows] = await db.query(sql, args);
  if (!rows[0]) return err(res, '没找到这块地', 404);
  const [thoughts] = await db.query(
    'SELECT id, dimension, content, level, img, created_at FROM thoughts WHERE session_id=? ORDER BY id', [rows[0].id]);
  const [milestones] = await db.query(
    'SELECT * FROM milestones WHERE session_id=? ORDER BY id DESC', [rows[0].id]);
  ok(res, { session: rows[0], thoughts, milestones });
});

// 篱笆外的话，一页十二句，摊六列
r.get('/garden/:id/messages', maybe, async (req, res) => {
  const { g, mode } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (mode === 'knock') return err(res, '主人只开了几块地给你看');
  const visitor = g.id !== req.uid;
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * MSG;
  const q = String(req.query.q || '').trim().slice(0, 40);
  let where = `m.garden_user_id=?${visitor ? ' AND m.created_at >= CURDATE()' : ''}`;
  const args = [g.id];
  if (q) {
    where += " AND (m.content LIKE ? ESCAPE '!' OR m.reply LIKE ? ESCAPE '!' OR u.nickname LIKE ? ESCAPE '!')";
    const like = likeArg(q);
    args.push(like, like, like);
  }
  const [list] = await db.query(
    `${messageSql} WHERE ${where} ORDER BY m.id DESC LIMIT ? OFFSET ?`, [...args, MSG, offset]);
  const [[{ total }]] = await db.query(
    `SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages m JOIN users u ON u.id=m.from_user_id
     WHERE ${where}`, args);
  ok(res, { list, total, page, limit: MSG, q });
});

// 留一句话：对同一块地一天最多三句；主人开了门，就算院里什么也没种下，也能留一句
r.post('/garden/:id/messages', auth, async (req, res) => {
  const { g, mode } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (g.id === req.uid) return err(res, '自己的地，看看就好');
  const content = String(req.body.content || '').trim();
  if (!content) return err(res, '总得写点什么');
  if (chars(content) > 100) return err(res, '话太长了，收一收');
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
  if (chars(reply) > 100) return err(res, '话太长了，收一收');
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

// 自己篱笆外的留言：全带回来，前端一页三条地翻，回过的另归旧回音
r.get('/messages/inbox', auth, async (req, res) => {
  const [list] = await db.query(
    `${messageSql} WHERE m.garden_user_id=? ORDER BY m.id DESC`, [req.uid]);
  const [[{ total }]] = await db.query(
    'SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages WHERE garden_user_id=?', [req.uid]);
  ok(res, { list, total });
});

// 我留在别人篱笆上的话：回音也一并带回来
r.get('/messages/outbox', auth, async (req, res) => {
  const [list] = await db.query(
    `SELECT m.id, m.garden_user_id, m.from_user_id, m.content, m.reply, m.replied_at, m.created_at,
       u.nickname, u.garden_name
     FROM messages m JOIN users u ON u.id=m.garden_user_id
     WHERE m.from_user_id=? ORDER BY m.id DESC`, [req.uid]);
  const [[{ total }]] = await db.query(
    'SELECT CAST(COUNT(*) AS SIGNED) AS total FROM messages WHERE from_user_id=?', [req.uid]);
  ok(res, {
    list: list.map(m => ({ ...m, garden_name: titleOf(m) })),
    total
  });
});

// 头像旁边那一小撮：自己篱笆上的话、留在别处的话和回音，还有门里门外的动静
r.get('/notices', auth, async (req, res) => {
  const [[box]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE garden_user_id=? AND reply IS NULL) AS messages,
       (SELECT COUNT(*) FROM messages WHERE garden_user_id=? AND reply IS NOT NULL) AS replied,
       (SELECT COUNT(*) FROM messages WHERE from_user_id=?) AS sent,
       (SELECT COUNT(*) FROM messages WHERE from_user_id=? AND reply IS NOT NULL) AS replies,
       (SELECT COUNT(DISTINCT visitor_id) FROM knocks WHERE garden_user_id=? AND status='pending') AS knocks,
       (SELECT COUNT(DISTINCT garden_user_id) FROM knocks WHERE visitor_id=? AND status='approved' AND seen_by_visitor=0) AS approvals`,
    [req.uid, req.uid, req.uid, req.uid, req.uid, req.uid]);
  const [out] = await db.query(
    `SELECT k.status FROM knocks k
     WHERE k.visitor_id=? AND (k.status='pending' OR (k.status='declined' AND k.seen_by_visitor=0))
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
  const [latestDecline] = await db.query(
    `SELECT k.decline_reason, k.decided_at, u.nickname, u.garden_name
     FROM knocks k JOIN users u ON u.id=k.garden_user_id
     WHERE k.visitor_id=? AND k.status='declined' AND k.decline_reason IS NOT NULL
       AND k.seen_by_visitor=0
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.visitor_id=k.visitor_id AND k2.garden_user_id=k.garden_user_id)
     ORDER BY k.id DESC LIMIT 1`, [req.uid]);
  ok(res, {
    ...box, waiting, declined,
    latest: latest[0] || null,
    latest_reply: latestReply[0] ? { ...latestReply[0], garden_name: titleOf(latestReply[0]) } : null,
    latest_sent: latestSent[0] ? { ...latestSent[0], garden_name: titleOf(latestSent[0]) } : null,
    latest_decline: latestDecline[0]
      ? { ...latestDecline[0], garden_name: titleOf(latestDecline[0]) } : null
  });
});

// 敲门的人和被敲的门：主人看进来的，访客看自己敲过的和已经开了的
r.get('/knocks', auth, async (req, res) => {
  const [incoming] = await db.query(
    `SELECT k.id, k.created_at, u.nickname, u.id AS visitor_id,
       (SELECT CAST(COUNT(*) AS SIGNED) FROM knocks k2
        WHERE k2.garden_user_id=k.garden_user_id AND k2.visitor_id=k.visitor_id) AS times
     FROM knocks k JOIN users u ON u.id=k.visitor_id
     WHERE k.garden_user_id=? AND k.status='pending'
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.garden_user_id=k.garden_user_id AND k2.visitor_id=k.visitor_id)
     ORDER BY k.id DESC`, [req.uid]);
  const [opened] = await db.query(
    `SELECT k.id, k.garden_user_id, k.seen_by_visitor, k.created_at,
       u.nickname, u.garden_name,
       (SELECT CAST(COUNT(*) AS SIGNED) FROM knock_plots kp WHERE kp.knock_id=k.id) AS plots
     FROM knocks k JOIN users u ON u.id=k.garden_user_id
     WHERE k.visitor_id=? AND k.status='approved'
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.garden_user_id=k.garden_user_id AND k2.visitor_id=k.visitor_id)
     ORDER BY k.id DESC`, [req.uid]);
  const [out] = await db.query(
    `SELECT k.id, k.garden_user_id, k.status, k.decline_reason, k.seen_by_visitor, k.created_at,
       u.nickname, u.garden_name,
       (SELECT k2.decline_reason FROM knocks k2
        WHERE k2.visitor_id=k.visitor_id AND k2.garden_user_id=k.garden_user_id
          AND k2.status='declined' ORDER BY k2.id DESC LIMIT 1) AS prior_reason
     FROM knocks k JOIN users u ON u.id=k.garden_user_id
     WHERE k.visitor_id=? AND k.status IN ('pending','declined')
       AND k.id=(SELECT MAX(k2.id) FROM knocks k2
         WHERE k2.visitor_id=k.visitor_id AND k2.garden_user_id=k.garden_user_id)
     ORDER BY k.id DESC`, [req.uid]);
  const shape = k => ({ ...k, garden_name: titleOf(k), prior_reason: k.prior_reason || '' });
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

// 谁敲门就让谁进来，只看这一扇门，不牵动别人
r.post('/knocks/:id/decide', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM knocks WHERE id=? AND garden_user_id=?', [req.params.id, req.uid]);
  const k = rows[0];
  if (!k) return err(res, '没这扇门', 404);
  if (k.status !== 'pending') return err(res, '这扇门已经定过了');
  if (!req.body.open) {
    const reason = String(req.body.reason || '').trim();
    if (!reason) return err(res, '总得给门外留个理由');
    if (chars(reason) > 60) return err(res, '理由短一点，门外听得清就行');
    await db.query("UPDATE knocks SET status='declined', decline_reason=?, decided_at=NOW() WHERE id=?",
      [reason, k.id]);
    return ok(res, { status: 'declined', reason });
  }
  const [sessions] = await db.query(
    "SELECT id FROM sessions WHERE user_id=? AND placement NOT IN ('picked','held')", [req.uid]);
  // 上回开过的那扇门已经看过了，这一次只留最新的回音，别在头像边上攒两个点
  await db.query(
    "UPDATE knocks SET seen_by_visitor=1 WHERE garden_user_id=? AND visitor_id=? AND status='approved'",
    [k.garden_user_id, k.visitor_id]);
  await db.query(
    "UPDATE knocks SET status='approved', decline_reason=NULL, decided_at=NOW(), seen_by_visitor=0 WHERE id=?",
    [k.id]);
  await db.query('DELETE FROM knock_plots WHERE knock_id=?', [k.id]);
  if (sessions.length) {
    await db.query('INSERT INTO knock_plots (knock_id, session_id) VALUES ?',
      [sessions.map(s => [k.id, s.id])]);
  }
  ok(res, { status: 'approved', plots: sessions.length });
});

r.post('/knocks/:id/seen', auth, async (req, res) => {
  await db.query(
    "UPDATE knocks SET seen_by_visitor=1 WHERE id=? AND visitor_id=? AND status IN ('approved','declined')",
    [req.params.id, req.uid]);
  ok(res);
});

// 在别人院里读到一片喜欢的叶子，夹进自己的书里；主人后来收起来也还留着
r.post('/garden/:id/session/:sid/keep', auth, async (req, res) => {
  const { g, mode, knock } = await inside(req);
  if (!g || !mode) return fenced(req, res, g);
  if (g.id === req.uid) return err(res, '自己的叶子，不用再夹');
  const [rows] = await db.query('SELECT id FROM sessions WHERE id=? AND user_id=?', [req.params.sid, g.id]);
  if (!rows[0]) return err(res, '没找到这片叶子', 404);
  if (mode === 'knock') {
    const [okPlot] = await db.query(
      'SELECT 1 FROM knock_plots WHERE knock_id=? AND session_id=?', [knock, rows[0].id]);
    if (!okPlot[0]) return err(res, '这片叶子没在主人开给你的地里');
  }
  await db.query('INSERT IGNORE INTO session_keeps (user_id, session_id) VALUES (?,?)',
    [req.uid, rows[0].id]);
  ok(res, { kept: true }, '夹进书里了');
});

r.delete('/keeps/:sid', auth, async (req, res) => {
  await db.query('DELETE FROM session_keeps WHERE user_id=? AND session_id=?', [req.uid, req.params.sid]);
  ok(res, { kept: false });
});

// 我夹在书里的那些叶子：主人开门才看得到字，围起来就只剩一句去敲门
r.get('/keeps', auth, async (req, res) => {
  const [list] = await db.query(
    `SELECT k.session_id, k.created_at AS kept_at,
       s.id, s.topic_name, s.title, s.question, s.level, s.thought_count, s.status, s.placement, s.started_at,
       EXISTS(SELECT 1 FROM thoughts WHERE session_id=s.id AND img <> '') AS has_img,
       u.id AS owner_id, u.nickname, u.garden_name, u.visibility,
       (u.visibility='public' OR EXISTS (
         SELECT 1 FROM knocks k2 WHERE k2.garden_user_id=u.id AND k2.visitor_id=? AND k2.status='approved'
       )) AS opened
     FROM session_keeps k
     JOIN sessions s ON s.id=k.session_id
     JOIN users u ON u.id=s.user_id
     WHERE k.user_id=?
     ORDER BY k.created_at DESC, s.id DESC`, [req.uid, req.uid]);
  ok(res, {
    list: list.map(s => s.opened ? {
      ...s, opened: true, garden_name: titleOf(s)
    } : {
      session_id: s.session_id, id: s.id, kept_at: s.kept_at, owner_id: s.owner_id,
      nickname: s.nickname, garden_name: titleOf(s), visibility: s.visibility,
      opened: false, title: '', question: '', topic_name: '', placement: s.placement
    }),
    total: list.length
  });
});

module.exports = r;
