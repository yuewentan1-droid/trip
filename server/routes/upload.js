const r = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { auth } = require('../auth');
const { ok, err } = require('../util');

const DIR = path.join(__dirname, '../uploads');
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
const MAX = 300 * 1024 * 1024;

fs.mkdirSync(DIR, { recursive: true });
// 照片不再绕成一大段 base64 塞进 JSON：直接把文件收进 uploads，三百兆以内都进得来
const receive = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (req, file, done) =>
      done(null, `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${EXT[file.mimetype]}`)
  }),
  limits: { fileSize: MAX },
  fileFilter: (req, file, done) => done(null, !!EXT[file.mimetype])
});

r.use(auth);

r.post('/', (req, res) => receive.single('file')(req, res, e => {
  if (e) return err(res, e.code === 'LIMIT_FILE_SIZE' ? '照片不能超过 300M' : '这张照片没传上来');
  if (!req.file) return err(res, '只能传 png、jpg、gif、webp 的照片');
  ok(res, { url: '/uploads/' + req.file.filename });
}));

module.exports = r;
