const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (!process.env.JWT_SECRET) {
  console.error('缺少 JWT_SECRET：先把 server/.env.example 复制成 server/.env，并换一串自己的密钥');
  process.exit(1);
}
const express = require('express');
const app = express();
const PORT = Number(process.env.PORT || 3010);

app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/thoughts', require('./routes/thoughts'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api', require('./routes/visits'));
// 接口的 404 得赶在前端兜底之前认领，不然打错的接口会拿回一张 index.html
app.use('/api', (req, res) => res.status(404).json({ code: 404, msg: '没这个接口' }));

// 打包好的前端也在这儿：一个源跑全站，不用再代理
const DIST = path.join(__dirname, '../web/dist');
app.use(express.static(DIST));
// createWebHistory 的路由刷新时也得有纸接住。Express 5 不认 '*'，用中间件兜
app.use((req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.json({ code: 1, msg: '地里出了点岔子：' + err.message });
});

app.listen(PORT, () => console.log(`一亩心田在 ${PORT} 等着`));
