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

## 官方四块田（可选）

想在部署完先看看满树、满地、满风的样子，可以把四个官方账号种进库里。密码都是 `12345678`：

| 登录名 | 田里有什么 |
| --- | --- |
| `风过篱笆` | 十六块地都开着口，风里撒满两百片 |
| `土里长歌` | 五条树根下各十五棵，地上种满 |
| `五棵树下` | 五棵树全部种满 |
| `藤爬半坡` | 一、三、五棵树种满，二、四两棵各十片；地上、风里也满；第四棵树里有一片挖到第三百层，叶子下挂三百滴 |

一键部署在空库上会自动种好这四块田；库里已经有官方账号时不会重种，留住篱笆上来往的话。想重新种，在项目根目录执行：

```bash
npm --prefix server run seed
```

也可以直接走 MySQL：

```bash
mysql -u root -p deep_thinking < server/sql/official.sql
```

脚本可以重复跑，每次都会先收掉这四个账号原来的地，再重新种。

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

以 Ubuntu / OpenCloudOS 9 服务器、MySQL 8、直接用 3010 端口为例。

### 一键部署（推荐）

买好 Ubuntu 22.04/24.04 或 OpenCloudOS 9 的机器，在安全组放行 3010 端口，然后登录服务器执行：

```bash
curl -fsSL https://raw.githubusercontent.com/yuewentan1-droid/trip/main/deploy.sh -o deploy.sh
sudo bash deploy.sh
```

脚本会自动识别 apt 或 dnf，完成下面手动步骤里的 1–5：装 Node.js 20、MySQL 8、PM2，建库并导入默认话题，库里还没有官方账号时顺手种上四块官方的田，生成带随机数据库密码和 `JWT_SECRET` 的 `.env`，构建前端并常驻启动，最后做健康检查。

重跑是安全的：已有的 `.env`、数据库和 `server/uploads` 都会保留，只拉新代码、重新构建并重启。在 OpenCloudOS / RHEL 系上，脚本还会把 MySQL root 的初始临时密码换成随机密码并写入 `/root/.my.cnf`，用于建库和后续重跑。其他发行版（非 apt/dnf）请先自行装好 Node.js 18+、MySQL 8、Git、pm2，再加 `--skip-provision` 运行。

### 手动部署

1. 安装 Node.js 18+、MySQL、Git，放行安全组的 3010 端口。

2. 拉代码，导入空库。

```bash
git clone <仓库地址> /srv/trip
cd /srv/trip
mysql -u root -p < server/sql/init.sql
```

3. 配置后端。

```bash
cd /srv/trip/server
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
cd /srv/trip/server && npm ci --omit=dev --registry=https://registry.npmmirror.com --replace-registry-host=always
cd /srv/trip/web && npm ci --registry=https://registry.npmmirror.com --replace-registry-host=always && npm run build
```

5. 启动并保持运行。

```bash
cd /srv/trip/server
pm2 start app.js --name trip
pm2 save
pm2 startup
```

没有 pm2 时也可以先直接运行：

```bash
cd /srv/trip/server
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

- `server/sql/init.sql` 是干净的初始化脚本：只建表、写入十六个系统主题，没有任何用户、思考、留言或敲门记录。`server/sql/official.sql` 是另外一份可选的演示数据。
- 登录、注册、改密码时，页面先向服务器取当次公钥，把密码加密后再交给接口；库里存的仍然是 bcrypt 哈希。这层只保证请求里没有明文，站点走 HTTP 时仍建议套 HTTPS 防中间人。
- 新用户默认把自己的田围起来。围起来的田仍会留在串门里，露出主页的名字、简介和留言数，种子细节与树不对外；点进去可以看主页、敲门，不会直接消失。
- 围起来的田被敲门后，访客只能看主人开放的地，不能修改；门开了，哪怕院里还没种下什么，也能留句话。
- 留言和敲门在两头都看得到：主人能看到收到的留言、自己回的话、敲门和已开的地；访客能看到留在别人篱笆上的话、主人的回音、等着的门、没开的门和已经开的地。一句话可以来回多说几轮，主人和留话的人都能接着回。
- 篱笆上的话默认谁都能看；主人在「自己的田，自己的名」里收起后，访客只看得见自己留过的那几句，主人仍看得到全部。
- 浏览数只参与排序，不返回给前端；留言数会在串门门牌和留言篱笆上显示。
- 名字、题名、类目名最多十个字；思考正文、封存标题下的正文、里程碑正文最多五百字；一条留言或回音最多一百字，同一个访客每天最多留三句。
