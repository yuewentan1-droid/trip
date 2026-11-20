# 一亩心田

一个用 Vue 3、Express 和 MySQL 写的私人思考记录本。每人有一块自己的田：开地、往下挖、封存、回看，也可以去别人的田里串门、在篱笆上留话。

## 目录

```
web/                 Vue 3 前端
  src/views/         原野、我的田地、串门、思考与回看
  src/components/    树、篱笆弹窗、留言纸、翻页等
  src/assets/doodle/ 手绘风图标
server/              Express API
  routes/            用户、主题、思考、留言、串门与敲门
  sql/init.sql       干净的空库结构，只带十六个默认真题
  uploads/           用户贴图，部署时要单独持久化
```

## 本地启动

需要 Node.js 18+ 和 MySQL 8。

1. 建库并导入表结构与默认主题。

```bash
mysql -u root -p < server/sql/init.sql
```

2. 配置后端环境变量。

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填好 MySQL 密码；`JWT_SECRET` 必须换成一串自己的随机值：

```bash
openssl rand -hex 32
```

3. 安装依赖并打包前端。

```bash
npm --prefix server ci
npm --prefix web ci
npm --prefix web run build
```

4. 启动。

```bash
npm --prefix server start
```

打开 `http://localhost:3010`。Express 会同时提供 `/api`、`/uploads` 和打包后的前端页面。

前后端分开调试时，另开一个终端运行 `npm --prefix web run dev`，Vite 在 `http://localhost:5173`，会把 `/api` 和 `/uploads` 代理到 3010。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 后端端口，默认 3010 |
| `DB_HOST` | MySQL 地址 |
| `DB_PORT` | MySQL 端口，默认 3306 |
| `DB_USER` | MySQL 用户 |
| `DB_PASS` | MySQL 密码 |
| `DB_NAME` | 数据库名，默认 `deep_thinking`，要和 `init.sql` 一致 |
| `JWT_SECRET` | 登录令牌密钥，部署时务必换成随机长串 |

`.env` 和本地上传的图片都不会提交到仓库。

## 部署到腾讯云

以 Ubuntu 服务器、MySQL 8、直接用 3010 端口为例。

1. 安装 Node.js 18+、MySQL、Git，放行安全组的 3010 端口。

2. 拉代码，导入空库。

```bash
git clone <仓库地址> /srv/yimuxintian
cd /srv/yimuxintian
mysql -u root -p < server/sql/init.sql
```

3. 配置后端。

```bash
cd /srv/yimuxintian/server
cp .env.example .env
```

填好数据库连接，把 `JWT_SECRET` 换成长随机串。建议给应用单独建 MySQL 用户，而不是长期用 root：

```sql
CREATE USER 'xintian'@'localhost' IDENTIFIED BY '换成自己的密码';
GRANT ALL PRIVILEGES ON deep_thinking.* TO 'xintian'@'localhost';
FLUSH PRIVILEGES;
```

4. 安装依赖并构建。

```bash
cd /srv/yimuxintian/server && npm ci --omit=dev
cd /srv/yimuxintian/web && npm ci && npm run build
```

5. 启动并保持运行。

```bash
cd /srv/yimuxintian/server
pm2 start app.js --name yimuxintian
pm2 save
pm2 startup
```

没有 pm2 时也可以先直接运行：

```bash
cd /srv/yimuxintian/server
npm start
```

6. 如果要绑定域名，用 Nginx 反代到 3010 即可。上传接口走 JSON，限制放宽到 8 MB。

```nginx
server {
    listen 80;
    server_name example.com;
    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

前端构建产物不入库，部署时必须执行一次 `npm --prefix web run build`。`server/uploads` 要保留并做备份，用户贴图都在里面。

## 数据与边界

- `server/sql/init.sql` 是干净的初始化脚本：只建表、写入十六个系统主题，没有任何用户、思考、留言或敲门记录。
- 新用户默认把自己的田围起来，只有主人能看到。公开后才会出现在串门里。
- 围起来的田被敲门后，主人可以选择开放哪几块地；访客只能看被开放的地，不能留言，也不能修改。
- 浏览数只参与排序，不返回给前端；留言数会在串门门牌和留言篱笆上显示。
- 名字、题名、类目名最多十个字；思考正文、封存标题下的正文、里程碑正文最多五百字；一条留言最多两百字，同一个访客每天最多留三句。
