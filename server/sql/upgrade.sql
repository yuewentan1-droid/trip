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
