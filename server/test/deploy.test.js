const path = require('node:path');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '../..');
const read = p => readFileSync(path.join(ROOT, p), 'utf8');

test('部署不拿本地库和本地话去盖线上', () => {
  const sh = read('deploy.sh');
  assert.doesNotMatch(sh, /\bmysqldump\b/);
  assert.doesNotMatch(sh, /\bLOAD DATA\b/i);
  assert.doesNotMatch(sh, /\b(scp|rsync)\b/);
  assert.match(sh, /official-ensure\.sql/);
  assert.match(sh, /total_users/);
});

test('官方账号只补缺，不 UPDATE、不 DELETE、不 REPLACE', () => {
  const sql = read('server/sql/official-ensure.sql');
  assert.match(sql, /INSERT IGNORE INTO users/);
  assert.doesNotMatch(sql, /\b(DELETE|UPDATE|REPLACE|TRUNCATE)\b/i);
});

test('完整示例只在空库种，库里有一个人就停下', () => {
  const sql = read('server/sql/official.sql');
  assert.match(sql, /seed_guard/);
  assert.match(sql, /INSERT INTO seed_guard SELECT 1 FROM users LIMIT 1/);
  assert.doesNotMatch(sql, /\b(DELETE FROM|UPDATE users|REPLACE INTO|TRUNCATE)\b/i);
});

test('五个官方账号都在，本地留言墙不跟着上线', () => {
  for (const f of ['server/sql/official.sql', 'server/sql/official-ensure.sql']) {
    const sql = read(f);
    for (const name of ['风过篱笆', '土里长歌', '五棵树下', '藤爬半坡', '官方'])
      assert.match(sql, new RegExp(`'${name}'`), `${f} 少了 ${name}`);
    assert.doesNotMatch(sql, /INSERT (?:IGNORE )?INTO (?:messages|message_replies|knocks)\b/i,
      `${f} 不该带本地的留言`);
  }
});

test('旧官方田改名有边界，不碰同名的普通人', () => {
  const sql = read('server/sql/upgrade.sql');
  assert.match(sql,
    /WHERE username='一亩心田'\s+AND nickname='一亩心田'\s+AND garden_name='一亩心田'/);
});

test('部署先过 P0 用户权限与隐私用例，再构建上线', () => {
  const sh = read('deploy.sh');
  const pkg = JSON.parse(read('server/package.json'));
  assert.match(sh, /npm test/);
  assert.match(sh, /\$\{DB_NAME\}_test/);
  assert.match(pkg.scripts.test, /privacy\.test\.js/);
  assert.ok(sh.indexOf('npm --prefix "$APP_DIR/server" ci') < sh.indexOf('npm test'),
    '先装好后端依赖再跑用例');
  assert.ok(sh.indexOf('npm test') < sh.indexOf('npm --prefix "$APP_DIR/web" run build'),
    '用例不通过就不能构建上线');
});

test('部署和升级脚本不删线上数据', () => {
  const sh = read('deploy.sh');
  for (const bad of [/\bDELETE\s+FROM\b/i, /\bDROP\s+(?:DATABASE|TABLE)\b/i, /\bTRUNCATE\b/i])
    assert.doesNotMatch(sh, bad);
  const up = read('server/sql/upgrade.sql');
  assert.doesNotMatch(up, /\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(up, /\bTRUNCATE\b/i);
});

test('提交前也跑 P0，不过就拦下', () => {
  const hook = read('.githooks/pre-commit');
  assert.match(hook, /npm run test:p0/);
  assert.match(hook, /exit 1/);
  const pkg = JSON.parse(read('server/package.json'));
  assert.match(pkg.scripts['test:p0'], /privacy\.test\.js/);
  assert.match(pkg.scripts['test:p0'], /deploy\.test\.js/);
});

test('官方账号补不齐就停下，先打印占名的行', () => {
  const sh = read('deploy.sh');
  assert.doesNotMatch(sh, /提醒：官方账号还缺/);
  assert.match(sh, /nickname IN \('风过篱笆'/);
  assert.match(sh, /fail "官方账号不齐/);
  assert.ok(sh.indexOf('官方账号不齐') < sh.indexOf('npm --prefix "$APP_DIR/web" run build'),
    '官方账号不齐时不能继续构建');
});
