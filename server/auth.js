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

// 串门名册和敞着门的院子给路过的人看；留话、收藏、回复仍然要登录
exports.maybe = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (h) {
    try { req.uid = jwt.verify(h.replace(/^Bearer /, ''), SECRET).id; } catch { /* 过期就当没登录 */ }
  }
  next();
};
