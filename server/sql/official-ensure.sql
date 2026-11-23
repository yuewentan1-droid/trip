-- 官方五个账号：四块田，一面收意见的墙；口令是固定的，不写进仓库
-- 只补缺的账号，不动已有账号，也不删任何话和地
-- 日常部署由 deploy.sh 自动执行；手动补也只会新增，重复跑无副作用
SET NAMES utf8mb4;

SET @pw := '$2a$10$lRtiTc0fHV3RT40KiW8ntO4o6UnTIr/XgPLvsxytXEibOLUkrFHlu';

INSERT IGNORE INTO users (username, password, nickname, visibility, garden_name, bio, extra_trees, views, published_at) VALUES
('风过篱笆', @pw, '风过篱笆', 'public', '风住的院子', '风从南边来，带着一身麦香。', 0, 1280, NOW()),
('土里长歌', @pw, '土里长歌', 'public', '长歌的田', '土里埋着种子，也埋着没说完的话。', 0, 960, NOW()),
('五棵树下', @pw, '五棵树下', 'public', '五棵树下', '五棵树，五种乘凉的法子。', 4, 1760, NOW()),
('藤爬半坡', @pw, '藤爬半坡', 'public', '半坡藤影', '一根藤慢慢爬，爬过半个坡。', 4, 2130, NOW()),
('官方', @pw, '官方', 'public', '官方', '路过的人写下的意见，都种在这一亩地里。', 0, 0, NOW());
