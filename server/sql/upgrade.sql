SET NAMES utf8mb4;
-- 老库补新列：脚本可以重复跑，已经有了就什么也不做
SET @has_tour := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'tour_seen'
);
SET @sql := IF(@has_tour = 0,
  'ALTER TABLE users ADD COLUMN tour_seen TINYINT NOT NULL DEFAULT 1 AFTER extra_trees',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

-- 篱笆上的话默认对来串门的人敞开；主人收起来，就只给自己和说过话的人看
SET @has_fence_private := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'fence_private'
);
SET @sql := IF(@has_fence_private = 0,
  'ALTER TABLE users ADD COLUMN fence_private TINYINT NOT NULL DEFAULT 0 AFTER bio',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

-- 我留出去的话也要顺着人找回来，给发送人补一道索引
SET @has_sender_idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'messages' AND index_name = 'idx_sender'
);
SET @sql := IF(@has_sender_idx = 0,
  'ALTER TABLE messages ADD INDEX idx_sender (from_user_id, created_at)',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

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

-- 回音被留话的人看过没有；老库里已经落下的回音都算看过，不再翻出来提醒
SET @has_reply_seen := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'message_replies' AND column_name = 'seen_by_author'
);
SET @sql := IF(@has_reply_seen = 0,
  'ALTER TABLE message_replies ADD COLUMN seen_by_author TINYINT NOT NULL DEFAULT 0 AFTER created_at',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;
SET @sql := IF(@has_reply_seen = 0,
  'UPDATE message_replies SET seen_by_author=1',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

-- 老库里每条 messages.reply 只存了一句回音，把它搬进新表；搬过就不再搬
INSERT INTO message_replies (message_id, user_id, content, created_at, seen_by_author)
SELECT m.id, m.garden_user_id, m.reply, COALESCE(m.replied_at, m.created_at), 1
FROM messages m
WHERE m.reply IS NOT NULL AND m.reply <> ''
  AND NOT EXISTS (SELECT 1 FROM message_replies r WHERE r.message_id = m.id);

-- 每一滴可以单独收起来；老想法默认都还敞着
SET @has_thought_visible := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'thoughts' AND column_name = 'visible'
);
SET @sql := IF(@has_thought_visible = 0,
  'ALTER TABLE thoughts ADD COLUMN visible TINYINT NOT NULL DEFAULT 1 AFTER level',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

-- 意见要挂进官方的墙，比篱笆上的一句话长一点
SET @msg_len := (
  SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'messages' AND column_name = 'content'
);
SET @sql := IF(@msg_len IS NOT NULL AND @msg_len < 300,
  'ALTER TABLE messages MODIFY content VARCHAR(300) NOT NULL',
  'DO 0');
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

-- 收话的那块官方田改叫「官方」；只认最初种下的那一行，改过就不再动
UPDATE IGNORE users SET username='官方', nickname='官方', garden_name='官方'
WHERE username='一亩心田' AND nickname='一亩心田' AND garden_name='一亩心田';
