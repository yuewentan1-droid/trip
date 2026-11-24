const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const net = require('node:net');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SERVER = path.join(__dirname, '..');
const DB = process.env.TEST_DB_NAME || 'deep_thinking_test';
const SECRET = 'p0-' + process.pid;
const uid = {}, tok = {}, msg = {}, ses = {}, tht = {};
let conn, child, base, logs = '';

if (!/^[A-Za-z0-9_]+$/.test(DB) || !/_test$/.test(DB) || DB === process.env.DB_NAME) {
  throw new Error('测试库名只能含字母数字下划线，必须以 _test 结尾，且不能和线上库同名');
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

async function api(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return res.json();
}

function okay(r) {
  assert.equal(r.code, 0, r.msg);
  return r.data;
}

async function addUser(name, { visibility = 'private', fence = 0, garden = name } = {}) {
  const [r] = await conn.query(
    'INSERT INTO users (username,password,nickname,visibility,garden_name,fence_private) VALUES (?,?,?,?,?,?)',
    [name, bcrypt.hashSync('test123', 4), name, visibility, garden, fence ? 1 : 0]);
  uid[name] = r.insertId;
  tok[name] = jwt.sign({ id: r.insertId, username: name }, SECRET);
  return r.insertId;
}

async function addMsg(garden, from, content, at = 'NOW()') {
  const [r] = await conn.query(
    `INSERT INTO messages (garden_user_id,from_user_id,content,created_at) VALUES (?,?,?,${at})`,
    [garden, from, content]);
  return r.insertId;
}

async function addSession(user, title, question = '问一句') {
  const [r] = await conn.query(
    `INSERT INTO sessions (user_id,topic_id,topic_name,title,question,status,placement,thought_count,level)
     VALUES (?,1,'哲学',?,?,'finished','tree',0,1)`, [user, title, question]);
  return r.insertId;
}

async function addThought(session, content, visible = 1) {
  const [r] = await conn.query(
    'INSERT INTO thoughts (session_id,dimension,content,level,visible) VALUES (?,?,?,1,?)',
    [session, '学科', content, visible ? 1 : 0]);
  return r.insertId;
}

async function wallHas(token, q) {
  const d = okay(await api('GET', `/messages/wall?q=${encodeURIComponent(q)}&limit=400`, { token }));
  return d.list.length;
}

async function wallTotal(token) {
  const d = okay(await api('GET', '/messages/wall?limit=400', { token }));
  return d.total;
}

async function gardenHas(token, id, q) {
  const d = okay(await api('GET', `/garden/${id}/messages?q=${encodeURIComponent(q)}`, { token }));
  return d.total;
}

before(async () => {
  conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
    multipleStatements: true
  });
  await conn.query('DROP DATABASE IF EXISTS ??', [DB]);
  const init = readFileSync(path.join(SERVER, 'sql/init.sql'), 'utf8').replaceAll('deep_thinking', DB);
  await conn.query(init);
  await conn.query(readFileSync(path.join(SERVER, 'sql/official-ensure.sql'), 'utf8'));

  // 三块敞着的院子、一块收着篱笆的院子，够把门禁的几种开法都走一遍
  await addUser('t_alice', { visibility: 'public', garden: 'alice的院' });
  await addUser('t_bob', { garden: 'bob的院' });
  await addUser('t_carol', { garden: 'carol的院' });
  await addUser('t_quiet', { visibility: 'public', fence: 1, garden: 'quiet的院' });
  await addUser('t_open', { visibility: 'public', garden: 'open的院' });
  const [official] = await conn.query("SELECT id FROM users WHERE username='官方'");
  uid.official = official[0].id;
  tok.official = jwt.sign({ id: uid.official, username: '官方' }, SECRET);
  const [feng] = await conn.query("SELECT id FROM users WHERE username='风过篱笆'");
  uid.feng = feng[0].id;

  msg.public = await addMsg(uid.t_alice, uid.t_bob, 'PUBLIC_OPEN 公开的一句话');
  msg.publicOld = await addMsg(uid.t_alice, uid.t_bob, 'PUBLIC_OLD 昨天公开的话',
    'DATE_SUB(NOW(), INTERVAL 1 DAY)');
  msg.fenceBob = await addMsg(uid.t_alice, uid.t_bob, 'FENCE_BOB 收起来的话');
  msg.fenceOld = await addMsg(uid.t_alice, uid.t_bob, 'FENCE_OLD 昨天的私话',
    'DATE_SUB(NOW(), INTERVAL 1 DAY)');
  msg.fenceCarol = await addMsg(uid.t_alice, uid.t_carol, 'FENCE_CAROL 另一句私话');
  msg.privateGarden = await addMsg(uid.t_alice, uid.t_bob, 'PRIVATE_GARDEN 围起来的话');
  msg.quiet = await addMsg(uid.t_quiet, uid.t_bob, 'QUIET_TALK 静院的话');
  msg.feedback = await addMsg(uid.official, uid.t_bob, 'OFFICIAL_SAY 意见墙的话');
  msg.feedbackOld = await addMsg(uid.official, uid.t_bob, 'OFFICIAL_OLD 昨天的意见',
    'DATE_SUB(NOW(), INTERVAL 1 DAY)');
  msg.feedbackCarol = await addMsg(uid.official, uid.t_carol, 'OFFICIAL_CAROL 另一句意见');
  msg.publicFinal = await addMsg(uid.t_open, uid.t_bob, 'PUBLIC_FINAL 一直敞着的话');
  msg.otherOfficial = await addMsg(uid.feng, uid.t_bob, 'OTHER_FIELD 另一块官方田的话');
  await conn.query(
    'INSERT INTO message_replies (message_id,user_id,content) VALUES (?,?,?)',
    [msg.fenceBob, uid.t_alice, 'REPLY_PRIVATE 回在私话下面']);
  await conn.query(
    'INSERT INTO message_replies (message_id,user_id,content) VALUES (?,?,?)',
    [msg.feedback, uid.official, 'OFFICIAL_REPLY 官方回在意见下面']);

  // 一块有明有暗的地、一块只剩暗的地；门里那块要单独开
  ses.visible = await addSession(uid.t_alice, '半明半暗');
  tht.visible = await addThought(ses.visible, 'VISIBLE_THOUGHT 露在外面的');
  tht.hidden = await addThought(ses.visible, 'HIDDEN_THOUGHT 收在土里的', 0);
  ses.hidden = await addSession(uid.t_alice, '全收起来');
  tht.onlyHidden = await addThought(ses.hidden, 'ONLY_HIDDEN 只有这一滴', 0);
  ses.knock = await addSession(uid.t_alice, '开给你的地');
  tht.knock = await addThought(ses.knock, 'KNOCK_THOUGHT 开门才看见');
  await conn.query(
    'INSERT INTO milestones (session_id,level,title,note,snapshot) VALUES (?,1,?,?,?)',
    [ses.visible, '一层', '', JSON.stringify({ thoughts: [{ content: 'HIDDEN_THOUGHT 收在土里的' }] })]);

  const port = await freePort();
  base = `http://127.0.0.1:${port}/api`;
  child = spawn(process.execPath, ['app.js'], {
    cwd: SERVER,
    env: { ...process.env, PORT: String(port), DB_NAME: DB, JWT_SECRET: SECRET },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => (logs += d));
  child.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('测试服务退出了：\n' + logs);
    try {
      if ((await fetch(base + '/auth/key')).ok) return;
    } catch { /* 还没起来 */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('测试服务没起来：\n' + logs);
});

after(async () => {
  if (child) {
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      child.kill();
    });
  }
  if (conn) {
    if (process.env.KEEP_TEST_DB !== '1') await conn.query('DROP DATABASE IF EXISTS ??', [DB]);
    await conn.end();
  }
});

test('P0 用户权限与隐私', async t => {
  await t.test('官方风墙只收写给官方的话，谁都看得见', async () => {
    assert.equal(await wallHas(null, 'OFFICIAL_SAY'), 1);
    assert.equal(await wallHas(tok.t_carol, 'OFFICIAL_SAY'), 1);
    assert.equal(await wallHas(tok.official, 'OFFICIAL_SAY'), 1);
    assert.equal(await wallHas(null, 'OFFICIAL_OLD'), 1, '意见墙留得住旧话');
    assert.equal(await wallHas(null, 'OFFICIAL_CAROL'), 1, '谁写的都收');
    assert.equal(await wallTotal(null), 3);
    assert.equal(await wallHas(null, 't_bob'), 2, '按留言人找得到写给官方的话');
    assert.equal(await wallHas(null, 'OFFICIAL_REPLY'), 1, '官方回在下面的话也找得到');
    assert.equal(await wallHas(null, 'alice的院'), 0, '别家的院名不会带出话');
    assert.equal(await wallHas(null, 'PUBLIC_OPEN'), 0, '别人家的话不上官方墙');
    assert.equal(await wallHas(null, 'PUBLIC_FINAL'), 0);
    assert.equal(await wallHas(null, 'OTHER_FIELD'), 0, '另外四块官方田也不并进来');

    assert.equal(await gardenHas(null, uid.t_alice, 'PUBLIC_OPEN'), 1);
    assert.equal(await gardenHas(null, uid.t_alice, 'PUBLIC_OLD'), 0, '院子里只挂今天的话');
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'PUBLIC_OLD'), 1, '主人翻得到旧话');
    assert.equal(await gardenHas(null, uid.t_quiet, 'QUIET_TALK'), 0, '收起的篱笆不在院里');
    assert.equal(await gardenHas(tok.t_quiet, uid.t_quiet, 'QUIET_TALK'), 1);
    assert.equal(await gardenHas(null, uid.feng, 'OTHER_FIELD'), 1, '官方田自己的篱笆照常');
  });

  await t.test('收起的篱笆：院子里只给主人和留过话的人看', async () => {
    okay(await api('PUT', '/auth/me', { token: tok.t_alice, body: { fence_private: 1 } }));
    assert.equal(await gardenHas(null, uid.t_alice, 'PUBLIC_OPEN'), 0, '收起篱笆后，旧话也不再给路过的人看');
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'PUBLIC_OPEN'), 1, '留话的人还看得见自己那句');
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'PUBLIC_OPEN'), 1, '主人看得见自家篱笆');
    assert.equal(await gardenHas(tok.t_carol, uid.t_alice, 'PUBLIC_OPEN'), 0, '没留过话的人看不见');
    assert.equal(await gardenHas(tok.official, uid.t_alice, 'PUBLIC_OPEN'), 0, '官方账号也不收私话');

    assert.equal(await gardenHas(null, uid.t_alice, 'FENCE_BOB'), 0);
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'FENCE_BOB'), 1);
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'FENCE_BOB'), 1);
    assert.equal(await gardenHas(tok.t_carol, uid.t_alice, 'FENCE_BOB'), 0);
    assert.equal(await gardenHas(tok.t_carol, uid.t_alice, 'FENCE_CAROL'), 1);
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'FENCE_CAROL'), 0);
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'FENCE_CAROL'), 1);
    assert.equal(await gardenHas(null, uid.t_alice, 'FENCE_OLD'), 0);
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'FENCE_OLD'), 0, '留话的人也只看今天');
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'FENCE_OLD'), 1);

    assert.notEqual((await api('PUT', `/messages/${msg.fenceBob}/reply`,
      { token: tok.t_carol, body: { reply: '不该我回' } })).code, 0);
    okay(await api('PUT', `/messages/${msg.fenceBob}/reply`,
      { token: tok.t_bob, body: { reply: 'REPLY_BOB 我回自己' } }));
    okay(await api('PUT', `/messages/${msg.fenceBob}/reply`,
      { token: tok.t_alice, body: { reply: 'REPLY_OWNER 主人回' } }));
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'REPLY_PRIVATE'), 1);
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'REPLY_PRIVATE'), 1);
    assert.equal(await gardenHas(tok.t_carol, uid.t_alice, 'REPLY_PRIVATE'), 0);
    assert.equal(await gardenHas(null, uid.t_alice, 'REPLY_PRIVATE'), 0);
    assert.equal(await gardenHas(tok.official, uid.t_alice, 'REPLY_PRIVATE'), 0);
    assert.equal(await wallHas(null, 'REPLY_PRIVATE'), 0, '官方墙不夹带别人院里的回音');

    const inbox = okay(await api('GET', '/messages/inbox', { token: tok.t_alice }));
    assert.ok(inbox.list.some(m => m.id === msg.fenceBob));
    assert.ok(inbox.list.some(m => m.id === msg.fenceCarol));
    const outbox = okay(await api('GET', '/messages/outbox', { token: tok.t_bob }));
    assert.ok(outbox.list.some(m => m.id === msg.fenceBob));
    const coutbox = okay(await api('GET', '/messages/outbox', { token: tok.t_carol }));
    assert.ok(coutbox.list.some(m => m.id === msg.fenceCarol));
    assert.ok(!coutbox.list.some(m => m.id === msg.fenceBob));

    okay(await api('PUT', '/auth/me', { token: tok.t_alice, body: { fence_private: 0 } }));
  });

  await t.test('围起来的院子：没开门连院子带话一起挡住', async () => {
    okay(await api('PUT', '/auth/me', { token: tok.t_alice, body: { visibility: 'private' } }));
    assert.equal((await api('GET', `/garden/${uid.t_alice}`)).code, 403);
    assert.equal((await api('GET', `/garden/${uid.t_alice}/messages`,
      { token: tok.t_carol })).code, 403);
    assert.equal(await wallHas(null, 'PRIVATE_GARDEN'), 0);
    assert.equal(await wallHas(tok.t_bob, 'PRIVATE_GARDEN'), 0, '官方墙不接别人院里的私话');
    assert.equal(await wallHas(tok.t_alice, 'PRIVATE_GARDEN'), 0);
    assert.equal(await wallHas(tok.t_carol, 'PRIVATE_GARDEN'), 0);
    assert.equal(await wallHas(tok.official, 'PRIVATE_GARDEN'), 0);
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'PRIVATE_GARDEN'), 1);
    const bobOut = okay(await api('GET', '/messages/outbox', { token: tok.t_bob }));
    assert.ok(bobOut.list.some(m => m.id === msg.privateGarden), '留话的人在自己的回音里还看得见');
    const aliceIn = okay(await api('GET', '/messages/inbox', { token: tok.t_alice }));
    assert.ok(aliceIn.list.some(m => m.id === msg.privateGarden), '主人收得到');
    assert.notEqual((await api('POST', `/garden/${uid.t_alice}/messages`,
      { token: tok.t_carol, body: { content: 'NOPE 不该进的门' } })).code, 0);
    assert.notEqual((await api('POST', `/garden/${uid.t_alice}/messages`,
      { token: tok.t_alice, body: { content: '自言自语' } })).code, 0);

    const visits = okay(await api('GET', '/visits?q=t_alice'));
    const card = visits.list.find(x => x.id === uid.t_alice);
    assert.ok(card);
    assert.equal(card.message_count, 0, '围起的院子不替私话报数');
    assert.equal(card.last_message_at, null);

    okay(await api('PUT', '/auth/me', { token: tok.t_alice, body: { visibility: 'public' } }));
  });

  await t.test('敲开门以后：只看主人开的地，私话仍只给两个人', async () => {
    okay(await api('PUT', '/auth/me',
      { token: tok.t_alice, body: { visibility: 'private', fence_private: 1 } }));
    assert.equal(okay(await api('POST', `/garden/${uid.t_alice}/knock`,
      { token: tok.t_bob })).status, 'pending');
    const ks = okay(await api('GET', '/knocks', { token: tok.t_alice }));
    const door = ks.incoming.find(k => k.visitor_id === uid.t_bob);
    assert.ok(door, '主人能看到门口的敲门');
    okay(await api('POST', `/knocks/${door.id}/decide`,
      { token: tok.t_alice, body: { open: true } }));

    const g = okay(await api('GET', `/garden/${uid.t_alice}`, { token: tok.t_bob }));
    assert.equal(g.mode, 'knock');
    assert.ok(g.sessions.some(s => s.id === ses.knock));
    assert.ok(!g.sessions.some(s => s.id === ses.hidden), '全收起来的地不开');

    const late = await addSession(uid.t_alice, '后来的地');
    await addThought(late, 'LATE_THOUGHT 后来才种的');
    assert.equal((await api('GET', `/garden/${uid.t_alice}/session/${late}`,
      { token: tok.t_bob })).code, 404, '开门后才种的地不在这次门里');
    assert.equal((await api('GET', `/garden/${uid.t_alice}/session/${ses.knock}`,
      { token: tok.t_bob })).code, 0);

    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'FENCE_BOB'), 1);
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'FENCE_CAROL'), 0);
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'FENCE_BOB'), 1);
    assert.equal((await api('GET', `/garden/${uid.t_alice}/messages`,
      { token: tok.t_carol })).code, 403);
    assert.equal(await wallHas(tok.t_bob, 'FENCE_BOB'), 0, '官方墙只收给官方的话');
    assert.equal(await wallHas(tok.t_carol, 'FENCE_BOB'), 0);
    assert.equal(await wallHas(tok.official, 'FENCE_BOB'), 0);

    okay(await api('PUT', '/auth/me',
      { token: tok.t_alice, body: { visibility: 'public', fence_private: 0 } }));
  });

  await t.test('收起来的一滴：院里、叶子、书页都不露', async () => {
    const garden = okay(await api('GET', `/garden/${uid.t_alice}`));
    const leaf = garden.sessions.find(s => s.id === ses.visible);
    assert.ok(leaf);
    assert.equal(leaf.thought_count, 1);
    assert.ok(!garden.sessions.some(s => s.id === ses.hidden));
    const detail = okay(await api('GET', `/garden/${uid.t_alice}/session/${ses.visible}`));
    assert.deepEqual(detail.thoughts.map(x => x.id), [tht.visible]);
    assert.deepEqual(detail.milestones, []);
    assert.equal((await api('GET', `/garden/${uid.t_alice}/session/${ses.hidden}`)).code, 404);

    okay(await api('POST', `/garden/${uid.t_alice}/session/${ses.visible}/keep`,
      { token: tok.t_carol }));
    let keeps = okay(await api('GET', '/keeps', { token: tok.t_carol }));
    let kept = keeps.list.find(k => k.id === ses.visible);
    assert.ok(kept);
    assert.equal(kept.opened, true);
    assert.equal(kept.title, '半明半暗');

    assert.notEqual((await api('PUT', `/thoughts/${tht.visible}/visible`,
      { token: tok.t_carol, body: { visible: false } })).code, 0);
    okay(await api('PUT', `/thoughts/${tht.visible}/visible`,
      { token: tok.t_alice, body: { visible: false } }));

    keeps = okay(await api('GET', '/keeps', { token: tok.t_carol }));
    kept = keeps.list.find(k => k.id === ses.visible);
    assert.equal(kept.opened, false);
    assert.equal(kept.hidden, true);
    assert.equal(kept.title, '');
    assert.equal(kept.question, '');
    const keptText = JSON.stringify(keeps);
    assert.ok(!keptText.includes('VISIBLE_THOUGHT'));
    assert.ok(!keptText.includes('HIDDEN_THOUGHT'));
    assert.equal((await api('GET', `/garden/${uid.t_alice}/session/${ses.visible}`)).code, 404);
    const after = okay(await api('GET', `/garden/${uid.t_alice}`));
    assert.ok(!after.sessions.some(s => s.id === ses.visible));
  });

  await t.test('官方账号的名字、门和钥匙都锁着', async () => {
    assert.notEqual((await api('PUT', '/auth/me',
      { token: tok.official, body: { nickname: '换个名' } })).code, 0);
    assert.notEqual((await api('PUT', '/auth/password',
      { token: tok.official, body: {} })).code, 0);
    assert.equal(okay(await api('GET', '/auth/me', { token: tok.official })).username, '官方');
  });

  await t.test('名册不替私话报数', async () => {
    const visits = okay(await api('GET', '/visits?q=t_quiet'));
    const card = visits.list.find(x => x.id === uid.t_quiet);
    assert.ok(card);
    assert.equal(card.message_count, 0);
    assert.equal(card.last_message_at, null);
    assert.equal(okay(await api('GET', '/visits?sort=recent&q=t_quiet')).total, 0);
    const alice = okay(await api('GET', '/visits?q=t_alice')).list.find(x => x.id === uid.t_alice);
    assert.ok(alice);
    assert.ok(alice.message_count > 0, '敞着的院子照常报数');
  });

  await t.test('官方风墙只露官方的话，篱笆怎么收都不夹带', async () => {
    okay(await api('PUT', '/auth/me', { token: tok.t_alice, body: { fence_private: 1 } }));

    // 别家的公开话、私话、回音，都不该出现在官方墙上
    for (const who of [null, tok.t_bob, tok.t_alice, tok.t_carol, tok.official]) {
      assert.equal(await wallHas(who, 'PUBLIC_OPEN'), 0);
      assert.equal(await wallHas(who, 'FENCE_BOB'), 0);
      assert.equal(await wallHas(who, 'FENCE_CAROL'), 0);
      assert.equal(await wallHas(who, 'REPLY_PRIVATE'), 0);
      assert.equal(await wallHas(who, 'QUIET_TALK'), 0);
      assert.equal(await wallHas(who, 'PUBLIC_FINAL'), 0);
    }
    for (const who of [null, tok.t_carol, tok.official])
      assert.equal(await wallHas(who, 'OFFICIAL_SAY'), 1, '给官方的话谁都看得见');

    // 院子自己的门禁仍然照旧
    assert.equal(await gardenHas(null, uid.t_alice, 'PUBLIC_OPEN'), 0);
    assert.equal(await gardenHas(tok.t_bob, uid.t_alice, 'PUBLIC_OPEN'), 1);
    assert.equal(await gardenHas(tok.t_alice, uid.t_alice, 'PUBLIC_OPEN'), 1);
    assert.equal(await gardenHas(tok.t_carol, uid.t_alice, 'PUBLIC_OPEN'), 0);
    assert.equal(await gardenHas(tok.official, uid.t_alice, 'PUBLIC_OPEN'), 0);

    assert.equal(await gardenHas(tok.t_bob, uid.t_quiet, 'QUIET_TALK'), 1);
    assert.equal(await gardenHas(tok.t_quiet, uid.t_quiet, 'QUIET_TALK'), 1);
    assert.equal(await gardenHas(null, uid.t_quiet, 'QUIET_TALK'), 0);
    assert.equal(await gardenHas(tok.t_alice, uid.t_quiet, 'QUIET_TALK'), 0);
    assert.equal(await gardenHas(tok.official, uid.t_quiet, 'QUIET_TALK'), 0);

    assert.equal(await gardenHas(null, uid.t_open, 'PUBLIC_FINAL'), 1);
    assert.equal(await gardenHas(tok.t_carol, uid.t_open, 'PUBLIC_FINAL'), 1);
    assert.equal(await gardenHas(tok.official, uid.t_open, 'PUBLIC_FINAL'), 1);

    const privateTokens = ['PUBLIC_OPEN', 'FENCE_BOB', 'FENCE_CAROL', 'REPLY_PRIVATE',
      'QUIET_TALK', 'PRIVATE_GARDEN', 'OTHER_FIELD', 'PUBLIC_FINAL', 'HIDDEN_THOUGHT', 'ONLY_HIDDEN'];
    for (const who of [null, tok.official]) {
      const all = okay(await api('GET', '/messages/wall?limit=400', { token: who }));
      assert.equal(all.total, 3, '风里只留写给官方的三句');
      const text = JSON.stringify(all);
      for (const token of privateTokens)
        assert.ok(!text.includes(token), `风里不该夹带 ${token}`);
    }
  });
});
