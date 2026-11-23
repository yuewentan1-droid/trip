#!/usr/bin/env bash
# 一亩心田一键部署脚本（Ubuntu / Debian / OpenCloudOS 9 等 RHEL 系）
# 用法：sudo bash deploy.sh [--skip-provision] [--dir /srv/trip] [--repo 仓库地址]
set -euo pipefail

REPO_URL="https://github.com/yuewentan1-droid/trip.git"
APP_DIR="/srv/trip"
SKIP_PROVISION=0
PM2_NAME="trip"
DEFAULT_DB_NAME="deep_thinking"
DEFAULT_DB_USER="xintian"
DEFAULT_PORT="3010"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"

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

# 固定 root 的家目录：MySQL 客户端才能读到脚本写入的 /root/.my.cnf，pm2 的数据也落在 /root/.pm2
export HOME=/root

# ---------- 1. 系统依赖 ----------
if [ "$SKIP_PROVISION" -eq 0 ]; then
  if command -v apt-get >/dev/null 2>&1; then
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
  elif command -v dnf >/dev/null 2>&1; then
    # OpenCloudOS 9 / RHEL 9 系：AppStream 自带 Node.js 20 和 MySQL 8
    log "安装系统依赖（OpenCloudOS / RHEL 系：git / curl / Node.js / MySQL 8）"
    dnf install -y git curl ca-certificates openssl
    dnf install -y nodejs

    if ! dnf install -y mysql-server; then
      log "源里没有 mysql-server，尝试 mysql-community-server"
      if ! dnf install -y mysql-community-server; then
        log "再尝试 AppStream 的 mysql 包"
        dnf install -y mysql \
          || fail "没装上 MySQL 8。若机器预装了 MariaDB，请先 dnf remove -y 'mariadb*' 再重跑；也可以手动安装 MySQL 8 后加 --skip-provision"
      fi
    fi

    if ! command -v mysqld >/dev/null 2>&1 && [ ! -x /usr/sbin/mysqld ]; then
      fail "只装上了 mysql 客户端，没找到 mysqld 服务端。请手动安装 MySQL 8 后加 --skip-provision 重跑"
    fi

    systemctl enable --now mysqld 2>/dev/null || systemctl enable --now mysql 2>/dev/null || true
  else
    fail "未识别的包管理器：自动安装只覆盖 apt（Ubuntu/Debian）和 dnf（OpenCloudOS/RHEL 系）。其他系统请先装好 Node.js 18+、MySQL 8、Git、pm2，再加 --skip-provision 重跑"
  fi
fi

command -v node  >/dev/null 2>&1 || fail "没找到 node，请先安装 Node.js 18+"
command -v npm   >/dev/null 2>&1 || fail "没找到 npm，请先安装 Node.js 18+"
command -v mysql >/dev/null 2>&1 || fail "没找到 mysql 客户端，请先安装 MySQL 8"
command -v git   >/dev/null 2>&1 || fail "没找到 git"

node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
[ "$node_major" -ge 18 ] || fail "Node.js 版本过低（当前 $(node -v)），请升级到 18+ 后重试"

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
[ -n "$DB_PASS" ] || DB_PASS="$(rand_hex 16)Aa1!"
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
mysql_ready() {
  mysql -e 'SELECT 1' >/dev/null 2>&1
}

prepare_mysql_root() {
  local i logfile line temp_pass new_pass

  for i in 1 2 3; do
    mysql_ready && return 0
    sleep 1
  done

  # OpenCloudOS / RHEL 系首次安装时，root 只有一个过期的临时密码。
  # 从初始化日志里读出来，换成本机随机密码并写进 /root/.my.cnf，建库和重跑都能直接用。
  temp_pass=""
  for logfile in /var/log/mysqld.log /var/log/mysql/mysqld.log /var/log/mysql/error.log; do
    [ -r "$logfile" ] || continue
    line=$(grep 'temporary password' "$logfile" 2>/dev/null | tail -1 || true)
    if [ -n "$line" ]; then
      temp_pass=${line##*: }
      break
    fi
  done

  if [ -n "$temp_pass" ] && [ ! -f /root/.my.cnf ]; then
    new_pass="$(rand_hex 20)Aa1!"
    log "初始化 MySQL root 密码（会写入 /root/.my.cnf）"
    if MYSQL_PWD="$temp_pass" mysql -uroot -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$new_pass';" >/dev/null 2>&1; then
      ( umask 077; printf '[client]\nuser=root\npassword=%s\n' "$new_pass" > /root/.my.cnf )
      mysql_ready || true
    fi
  fi

  mysql_ready || fail "无法用 root 连接 MySQL。请检查 mysqld 是否已启动（systemctl status mysqld），并配置好 /root/.my.cnf（或让 root 免密登录）；也可以先手动建库建用户再加 --skip-provision 重跑"
}

prepare_mysql_root

log "准备数据库 $DB_NAME"
has_topics=$(mysql -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='topics'" 2>/dev/null || echo 0)
if [ "$has_topics" = "0" ]; then
  mysql --default-character-set=utf8mb4 < "$APP_DIR/server/sql/init.sql"
else
  echo "数据库已存在，跳过初始化（不会覆盖任何数据）"
fi

echo "补齐老库里后来加的列"
mysql --default-character-set=utf8mb4 "$DB_NAME" < "$APP_DIR/server/sql/upgrade.sql"

# 库里还没有官方账号时，把四块官方的田种上；已有的不动，免得收走篱笆上的话
official=$(mysql --default-character-set=utf8mb4 -N -B "$DB_NAME" -e "SELECT COUNT(*) FROM users WHERE username IN ('风过篱笆','土里长歌','五棵树下','藤爬半坡')" 2>/dev/null || echo 0)
if [ "$official" = "0" ]; then
  log "种上四块官方的田"
  mysql --default-character-set=utf8mb4 "$DB_NAME" < "$APP_DIR/server/sql/official.sql"
else
  echo "官方账号已在，原位留着"
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
npm --prefix "$APP_DIR/server" ci --omit=dev --registry="$NPM_REGISTRY" --replace-registry-host=always

log "安装前端依赖并构建"
npm --prefix "$APP_DIR/web" ci --registry="$NPM_REGISTRY" --replace-registry-host=always
npm --prefix "$APP_DIR/web" run build

# ---------- 6. 启动并常驻 ----------
log "启动 / 重启服务"
command -v pm2 >/dev/null 2>&1 || npm i -g pm2 --registry="$NPM_REGISTRY"
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
