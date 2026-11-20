const jwt = require('jsonwebtoken');
const { err } = require('./util');
const SECRET = process.env.JWT_SECRET;

exports.sign = (u) => jwt.sign({ id: u.id, username: u.username }, SECRET, { expiresIn: '7d' });

exports.auth = (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    req.uid = jwt.verify(h.replace(/^Bearer /, ''), SECRET).id;
    next();
  } catch {
    err(res, '登录过期了，重新进一次', 401);
  }
};

// 敞着门的地，路过的人不登录也该能看一眼；围起来的仍然只认主人
exports.maybe = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (h) {
    try { req.uid = jwt.verify(h.replace(/^Bearer /, ''), SECRET).id; } catch { /* 过期就当没登录 */ }
  }
  next();
};
