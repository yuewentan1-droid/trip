SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS deep_thinking DEFAULT CHARSET utf8mb4;
USE deep_thinking;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  nickname VARCHAR(10) NOT NULL DEFAULT '' UNIQUE,
  visibility ENUM('public','private') NOT NULL DEFAULT 'private',
  garden_name VARCHAR(10) NOT NULL DEFAULT '',
  bio VARCHAR(60) NOT NULL DEFAULT '',
  -- 篱笆上的话默认谁都看得见；主人收起来，就只留给自己和说过话的人
  fence_private TINYINT NOT NULL DEFAULT 0,
  extra_trees INT NOT NULL DEFAULT 0,
  -- 新注册的用户是 0，头一回进院子看一遍各条路，看完就记成 1；老用户默认已经看过
  tour_seen TINYINT NOT NULL DEFAULT 1,
  views INT NOT NULL DEFAULT 0,
  published_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  category VARCHAR(20) NOT NULL,
  name VARCHAR(10) NOT NULL,
  icon VARCHAR(20) DEFAULT 'sprout',
  intro VARCHAR(200) DEFAULT '',
  img VARCHAR(200) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  topic_id INT NOT NULL,
  topic_name VARCHAR(10) NOT NULL,
  title VARCHAR(10) NOT NULL,
  question TEXT,
  level INT DEFAULT 1,
  thought_count INT DEFAULT 0,
  status VARCHAR(10) DEFAULT 'running',
  placement ENUM('tree','ground','wind','picked','held') NOT NULL DEFAULT 'tree',
  branch TINYINT DEFAULT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME
);

CREATE TABLE IF NOT EXISTS thoughts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  dimension VARCHAR(20) NOT NULL,
  content VARCHAR(500) NOT NULL,
  img VARCHAR(200) DEFAULT '',
  level INT DEFAULT 1,
  -- 这一滴给不给外人看；收起来的，连叶子也不在别人院里露面
  visible TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_thoughts_session (session_id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  level INT NOT NULL,
  title VARCHAR(10) DEFAULT '',
  note VARCHAR(500) DEFAULT '',
  snapshot JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_milestones_session (session_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  garden_user_id INT NOT NULL,
  from_user_id INT NOT NULL,
  content VARCHAR(300) NOT NULL,
  reply VARCHAR(200) DEFAULT NULL,
  replied_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_garden (garden_user_id, created_at),
  INDEX idx_from (garden_user_id, from_user_id, created_at),
  INDEX idx_sender (from_user_id, created_at)
);

-- 一句话可以来回多说几轮；messages 还是那句话，回音按先后落在下面
CREATE TABLE IF NOT EXISTS message_replies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  content VARCHAR(200) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  seen_by_author TINYINT NOT NULL DEFAULT 0,
  INDEX idx_replies (message_id, id)
) DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS knocks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  garden_user_id INT NOT NULL,
  visitor_id INT NOT NULL,
  status ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
  decline_reason VARCHAR(120) DEFAULT NULL,
  seen_by_visitor TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME DEFAULT NULL,
  INDEX idx_garden (garden_user_id, status, created_at),
  INDEX idx_visitor (visitor_id, status, created_at)
);

CREATE TABLE IF NOT EXISTS knock_plots (
  knock_id INT NOT NULL,
  session_id INT NOT NULL,
  PRIMARY KEY (knock_id, session_id)
);

-- 别人院里采回自己书页的那片叶子；主人收起来或设了围栏也不删，
-- 只是按主人当下的门禁决定还能不能看
CREATE TABLE IF NOT EXISTS session_keeps (
  user_id INT NOT NULL,
  session_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, session_id),
  KEY idx_keep_session (session_id)
);

INSERT INTO topics (user_id, category, name, icon, intro) VALUES
(NULL,'学科','哲学','openbook','追问那些没答案的问题'),
(NULL,'学科','心理学','puzzle','看看自己脑子里在演什么'),
(NULL,'学科','经济学','bills','凡事都有代价，代价是什么'),
(NULL,'学科','生物学','leaf','从生存和演化角度看'),
(NULL,'学科','历史学','scroll','过去的人怎么处理同样的事'),
(NULL,'行业','互联网','laptop','效率、流量、增长'),
(NULL,'行业','教育','note','教与学之间那道缝'),
(NULL,'行业','医疗','shield','确定性与不确定性'),
(NULL,'行业','农业','sun','慢下来的节奏'),
(NULL,'人群','学生','pen','还没被磨平的那部分'),
(NULL,'人群','社会人','gear','被生活推着走的那部分'),
(NULL,'人群','老人','moons','回头看时的判断'),
(NULL,'幻想','如果时间可以倒流','undo',''),
(NULL,'幻想','一百年后的城市','cube',''),
(NULL,'幻想','如果动物会说话','bird',''),
(NULL,'幻想','平行世界的我','copy','');
