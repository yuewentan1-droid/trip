const r = require('express').Router();
const fs = require('fs');
const path = require('path');
const { auth } = require('../auth');
const { ok, err } = require('../util');

const DIR = path.join(__dirname, '../uploads');
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };

r.use(auth);

// 前端把贴图读成 dataURL 递过来，落一张在 uploads 里，回一条能直接贴进 <img> 的路
r.post('/', (req, res) => {
  const [head, body] = String(req.body.data || '').split(',');
  const ext = EXT[(head.match(/data:(image\/\w+);/) || [])[1]];
  if (!ext) return err(res, '这张图地里认不出来');
  fs.mkdirSync(DIR, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
  fs.writeFileSync(path.join(DIR, name), Buffer.from(body, 'base64'));
  ok(res, { url: '/uploads/' + name });
});

module.exports = r;
