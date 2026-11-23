const r = require('express').Router();
const bcrypt = require('bcryptjs');
const { generateKeyPairSync, privateDecrypt, constants } = require('crypto');
const db = require('../db');
const { sign, auth } = require('../auth');
const { ok, err } = require('../util');

// 密码不在明信片上走：页面拿这把公钥锁好，服务器收到再拆开
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' });
const open = v => privateDecrypt(
  { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
  Buffer.from(String(v), 'base64')
).toString('utf8');

const EXTRA_TREES_MAX = 4;
const shape = u => ({
  id: u.id, username: u.username, nickname: u.nickname,
  visibility: u.visibility, garden_name: u.garden_name, bio: u.bio,
  fence_private: u.fence_private ? 1 : 0,
  extra_trees: Math.min(EXTRA_TREES_MAX, u.extra_trees || 0),
  tour_seen: u.tour_seen ? 1 : 0
});
const chars = s => [...String(s)].length;

r.get('/key', (req, res) => ok(res, { key: PUBLIC_KEY }));

r.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = open(req.body.password);
  if (!username) return err(res, '名字总得起一个');
  if (chars(username) > 10) return err(res, '名字最多十个字');
  if (password.length < 6) return err(res, '密码至少六位');
  const [dup] = await db.query('SELECT id FROM users WHERE username=?', [username]);
  if (dup.length) return err(res, '这名字被人占了，换一个');
  const [ret] = await db.query(
    'INSERT INTO users (username, password, nickname, tour_seen) VALUES (?,?,?,0)',
    [username, bcrypt.hashSync(password, 10), username]);
  const u = { id: ret.insertId, username, nickname: username, visibility: 'private',
    garden_name: '', bio: '', fence_private: 0, extra_trees: 0, tour_seen: 0 };
  ok(res, { token: sign(u), user: u });
});

r.post('/login', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username=?', [req.body.username]);
  const u = rows[0];
  if (!u || !bcrypt.compareSync(open(req.body.password), u.password)) return err(res, '名字和密码对不上');
  ok(res, { token: sign(u), user: shape(u) });
});

r.get('/me', auth, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, username, nickname, visibility, garden_name, bio, fence_private, extra_trees, tour_seen FROM users WHERE id=?', [req.uid]);
  ok(res, rows[0]);
});

r.post('/tour', auth, async (req, res) => {
  await db.query('UPDATE users SET tour_seen=1 WHERE id=?', [req.uid]);
  ok(res);
});

// 篱笆、地名、一句话、名字：改哪样传哪样，没传的保持原样
r.put('/me', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id=?', [req.uid]);
  const u = rows[0];
  const visibility = ['public', 'private'].includes(req.body.visibility)
    ? req.body.visibility : u.visibility;

  let nickname = u.nickname;
  if (req.body.nickname !== undefined) {
    nickname = String(req.body.nickname).trim();
    if (!nickname) return err(res, '名字不能空着');
    if (chars(nickname) > 10) return err(res, '名字最多十个字');
    const [dup] = await db.query('SELECT id FROM users WHERE nickname=? AND id<>?', [nickname, req.uid]);
    if (dup.length) return err(res, '这名字被人占了，换一个');
  }

  const garden_name = req.body.garden_name === undefined
    ? u.garden_name : String(req.body.garden_name).trim();
  if (chars(garden_name) > 10) return err(res, '田名最多十个字');
  let bio = u.bio;
  if (req.body.bio !== undefined) {
    bio = String(req.body.bio).trim();
    if (chars(bio) > 30) return err(res, '篱笆上那句话最多三十个字');
  }
  const extra_trees = req.body.extra_trees === undefined
    ? u.extra_trees : Math.min(EXTRA_TREES_MAX, Math.max(0, Number(req.body.extra_trees) || 0));
  const fence_private = req.body.fence_private === undefined
    ? (u.fence_private ? 1 : 0) : (req.body.fence_private ? 1 : 0);
  const published_at = visibility === 'public' && u.visibility !== 'public' ? new Date() : u.published_at;
  await db.query(
    'UPDATE users SET nickname=?, visibility=?, garden_name=?, bio=?, fence_private=?, extra_trees=?, published_at=? WHERE id=?',
    [nickname, visibility, garden_name, bio, fence_private, extra_trees, published_at, req.uid]);
  ok(res, { ...shape(u), nickname, visibility, garden_name, bio, fence_private, extra_trees });
});

r.put('/password', auth, async (req, res) => {
  const [rows] = await db.query('SELECT password FROM users WHERE id=?', [req.uid]);
  if (!bcrypt.compareSync(open(req.body.old_password), rows[0].password))
    return err(res, '原来的密码不对');
  const next = open(req.body.password);
  if (next.length < 6) return err(res, '新密码至少六位');
  await db.query('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(next, 10), req.uid]);
  ok(res);
});

module.exports = r;
