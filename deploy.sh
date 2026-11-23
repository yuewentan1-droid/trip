#!/usr/bin/env bash
# 一亩心田一键部署脚本（Ubuntu / Debian）
# 用法：sudo bash deploy.sh [--skip-provision] [--dir /srv/yimuxintian] [--repo 仓库地址]
set -euo pipefail

REPO_URL="https://github.com/yuewentan1-droid/trip.git"
APP_DIR="/srv/yimuxintian"
SKIP_PROVISION=0
PM2_NAME="yimuxintian"
DEFAULT_DB_NAME="deep_thinking"
DEFAULT_DB_USER="xintian"
DEFAULT_PORT="3010"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-provision) SKIP_PROVISION=1 ;;
    --dir) APP_DIR="${2:?--dir 后面要跟目录}"; shift ;;
    --repo) REPO_URL="${2:?--repo 后面要跟仓库地址}"; shift ;;
    -h|--help) sed -n '2,3p' "$0"; exit 0 ;;
    *) fail "未知参数：$1（用 --help 查看用法）" ;;
  esac
  shift
done

[ "$(id -u)" -eq 0 ] || fail "请用 root 或 sudo 运行：sudo bash deploy.sh"

# ---------- 1. 系统依赖 ----------
if [ "$SKIP_PROVISION" -eq 0 ]; then
  command -v apt-get >/dev/null 2>&1 \
    || fail "本脚本的自动安装只覆盖 Ubuntu/Debian。其他系统请先装好 Node.js 18+、MySQL 8、Git、pm2，再加 --skip-provision 重跑"

  log "安装系统依赖（git / curl / MySQL 8）"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y git curl ca-certificates openssl mysql-server

  node_major=0
  if command -v node >/dev/null 2>&1; then
    node_major=$(node -p 'process.versions.node.split(".")[0]')
  fi
  if [ "$node_major" -lt 18 ]; then
    log "安装 Node.js 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  systemctl enable --now mysql 2>/dev/null || systemctl enable --now mysqld 2>/dev/null || true
fi

command -v node  >/dev/null 2>&1 || fail "没找到 node，请先安装 Node.js 18+"
command -v npm   >/dev/null 2>&1 || fail "没找到 npm，请先安装 Node.js 18+"
command -v mysql >/dev/null 2>&1 || fail "没找到 mysql 客户端，请先安装 MySQL 8"
command -v git   >/dev/null 2>&1 || fail "没找到 git"

# ---------- 2. 拉代码 ----------
log "拉取代码到 $APP_DIR"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
elif [ -d "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
  fail "$APP_DIR 已存在且不是 git 仓库，请先清空它或换 --dir"
else
  git clone "$REPO_URL" "$APP_DIR"
fi

# ---------- 3. 环境变量 ----------
ENV_FILE="$APP_DIR/server/.env"
DB_NAME="$DEFAULT_DB_NAME"
DB_USER="$DEFAULT_DB_USER"
PORT="$DEFAULT_PORT"
DB_PASS=""
JWT_SECRET=""
if [ -f "$ENV_FILE" ]; then
  log "沿用已有 server/.env"
  DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
  DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
  PORT=$(grep -E '^PORT=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
  DB_PASS=$(grep -E '^DB_PASS=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
  JWT_SECRET=$(grep -E '^JWT_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)
fi
[ -n "$DB_NAME" ] || DB_NAME="$DEFAULT_DB_NAME"
[ -n "$DB_USER" ] || DB_USER="$DEFAULT_DB_USER"
[ -n "$PORT" ] || PORT="$DEFAULT_PORT"

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}
[ -n "$DB_PASS" ] || DB_PASS=$(rand_hex 16)
[ -n "$JWT_SECRET" ] || JWT_SECRET=$(rand_hex 32)

log "写入 server/.env"
cat > "$ENV_FILE" <<EOF
PORT=$PORT
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
EOF
chmod 600 "$ENV_FILE"

# ---------- 4. 数据库 ----------
log "准备数据库 $DB_NAME"
has_topics=$(mysql -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='topics'" 2>/dev/null || echo 0)
if [ "$has_topics" = "0" ]; then
  mysql --default-character-set=utf8mb4 < "$APP_DIR/server/sql/init.sql"
else
  echo "数据库已存在，跳过初始化（不会覆盖任何数据）"
fi

mysql <<SQL
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

# ---------- 5. 依赖与构建 ----------
log "安装后端依赖"
npm --prefix "$APP_DIR/server" ci --omit=dev

log "安装前端依赖并构建"
npm --prefix "$APP_DIR/web" ci
npm --prefix "$APP_DIR/web" run build

# ---------- 6. 启动并常驻 ----------
log "启动 / 重启服务"
command -v pm2 >/dev/null 2>&1 || npm i -g pm2
cd "$APP_DIR/server"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start app.js --name "$PM2_NAME"
fi
pm2 save
pm2 startup systemd >/dev/null 2>&1 || true

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "$PORT/tcp" >/dev/null || true
fi
if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-port="$PORT/tcp" >/dev/null || true
  firewall-cmd --reload >/dev/null || true
fi

# ---------- 7. 健康检查 ----------
log "健康检查"
healthy=0
for _ in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)
  if [ "$code" = "200" ]; then healthy=1; break; fi
  sleep 1
done
[ "$healthy" = "1" ] || fail "服务没起来，查看日志：pm2 logs $PM2_NAME"

PUBLIC_IP=$(curl -s --max-time 3 http://metadata.tencentyun.com/latest/meta-data/public-ipv4 2>/dev/null || true)
[ -n "$PUBLIC_IP" ] || PUBLIC_IP=$(curl -s --max-time 3 https://ifconfig.me 2>/dev/null || true)
[ -n "$PUBLIC_IP" ] || PUBLIC_IP="<服务器公网IP>"

printf '\n\033[1;32m部署完成\033[0m\n'
echo "访问：http://$PUBLIC_IP:$PORT"
echo "提醒：腾讯云控制台的安全组要放行 TCP $PORT（入站）"
echo "日志：pm2 logs $PM2_NAME"
echo "重启：pm2 restart $PM2_NAME"
echo "数据：server/uploads 里的用户贴图请定期备份，重新部署不会删除它"
