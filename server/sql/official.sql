-- 官方四块田：密码都是 12345678
-- 用法（在项目根目录）：mysql -u root -p deep_thinking < server/sql/official.sql
-- 可重复跑：会先收掉上一次种下的这四块田，再重新种
SET NAMES utf8mb4;

SET @pw := '$2a$10$lRtiTc0fHV3RT40KiW8ntO4o6UnTIr/XgPLvsxytXEibOLUkrFHlu';

-- 上次的旧地先收干净，别叠成两层
CREATE TEMPORARY TABLE seed_user (id INT PRIMARY KEY);
INSERT INTO seed_user SELECT id FROM users WHERE username IN ('风过篱笆','土里长歌','五棵树下','藤爬半坡');
DELETE t FROM thoughts t JOIN sessions s ON s.id=t.session_id WHERE s.user_id IN (SELECT id FROM seed_user);
DELETE m FROM milestones m JOIN sessions s ON s.id=m.session_id WHERE s.user_id IN (SELECT id FROM seed_user);
DELETE kp FROM knock_plots kp JOIN sessions s ON s.id=kp.session_id WHERE s.user_id IN (SELECT id FROM seed_user);
DELETE sk FROM session_keeps sk JOIN sessions s ON s.id=sk.session_id WHERE s.user_id IN (SELECT id FROM seed_user);
DELETE FROM sessions WHERE user_id IN (SELECT id FROM seed_user);
DELETE mr FROM message_replies mr JOIN messages m ON m.id=mr.message_id
  JOIN seed_user su ON su.id=m.garden_user_id OR su.id=m.from_user_id;
DELETE m FROM messages m JOIN seed_user su ON su.id=m.garden_user_id OR su.id=m.from_user_id;
DELETE k FROM knocks k JOIN seed_user su ON su.id=k.garden_user_id OR su.id=k.visitor_id;
DELETE FROM session_keeps WHERE user_id IN (SELECT id FROM seed_user);
DELETE FROM users WHERE id IN (SELECT id FROM seed_user);
DROP TEMPORARY TABLE seed_user;

INSERT INTO users (username, password, nickname, visibility, garden_name, bio, extra_trees, views, published_at) VALUES
('风过篱笆', @pw, '风过篱笆', 'public', '风住的院子', '风从南边来，带着一身麦香。', 0, 1280, NOW()),
('土里长歌', @pw, '土里长歌', 'public', '长歌的田', '土里埋着种子，也埋着没说完的话。', 0, 960, NOW()),
('五棵树下', @pw, '五棵树下', 'public', '五棵树下', '五棵树，五种乘凉的法子。', 4, 1760, NOW()),
('藤爬半坡', @pw, '藤爬半坡', 'public', '半坡藤影', '一根藤慢慢爬，爬过半个坡。', 4, 2130, NOW());

SET @u1 := (SELECT id FROM users WHERE username='风过篱笆');
SET @u2 := (SELECT id FROM users WHERE username='土里长歌');
SET @u3 := (SELECT id FROM users WHERE username='五棵树下');
SET @u4 := (SELECT id FROM users WHERE username='藤爬半坡');

-- 一把数到三百的种子，下面按各处要用的数目截取
CREATE TEMPORARY TABLE seq (n INT PRIMARY KEY);
INSERT INTO seq WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM c WHERE n<300) SELECT n FROM c;

-- 题名和问题：风里、地上、树上轮着用
CREATE TEMPORARY TABLE seed_title (id INT PRIMARY KEY, title VARCHAR(10) NOT NULL, question VARCHAR(200) NOT NULL);
INSERT INTO seed_title (id, title, question) VALUES
(1,'晨露未干','今天最早想到的一件事，是什么？'),
(2,'灶膛里的火','火苗舔着锅底，你在等什么慢慢熟？'),
(3,'雨后田埂','雨停之后，哪一步最先踩进泥里？'),
(4,'一把旧镰刀','顺手的东西用久了，舍不得换，是为什么？'),
(5,'井绳磨手','每天重复的那件事，磨掉了什么，又留下了什么？'),
(6,'晒谷场','摊开在太阳底下的，除了谷子还有什么？'),
(7,'半坡的草','没人管的地方，为什么反而长得旺？'),
(8,'晚风过篱','风穿过篱笆时，带走了谁家的话？'),
(9,'月下挑水','夜里做的那点事，是给谁看的？'),
(10,'老牛反刍','嚼过一遍的东西，再嚼时味道变了吗？'),
(11,'田缺口','水总往低处走，人为什么偏要往高处想？'),
(12,'一畦韭菜','割了一茬又长一茬，这叫韧性还是认命？'),
(13,'谷仓见底','余粮不多的时候，人最先省掉什么？'),
(14,'春天的迟信','该来的没来，你还会等几天？'),
(15,'冬天的空枝','光秃秃的枝上，藏着什么夏天看不见的东西？'),
(16,'屋檐滴水','一滴一滴，为什么石头也会让路？'),
(17,'草帽檐下','遮住眼睛的那片阴影，替你挡住了什么？'),
(18,'河湾打转','水流到这里总要绕一圈，人有没有绕不过的弯？'),
(19,'山坳里的雾','看不清的时候，你靠什么往前挪？'),
(20,'小路分岔','两条都长着草的路，你怎么选？'),
(21,'蝉声最响时','叫得最响的，是不是最热的那阵？'),
(22,'萤火过河','一点亮光也敢过河，它凭的是什么？'),
(23,'燕子回梁','年年回来同一根梁，是记性还是执念？'),
(24,'南瓜爬墙','墙那么高，藤为什么还是往上够？'),
(25,'红薯埋土','看不见的果实，怎么知道它长大了？'),
(26,'秋收后','地空下来以后，心是不是也跟着空？'),
(27,'柴火成堆','攒下来的东西，哪些真能过冬？'),
(28,'雪落无声','最安静的时候，你听见了什么？'),
(29,'一口老井','井水不犯河水，可它为什么从不干？'),
(30,'石磨转圈','走了一千圈还在原地，磨出了什么？'),
(31,'鸡鸣头遍','天还没亮就起身，是为了抢什么？'),
(32,'黄昏收网','网里没有鱼的时候，你收不收？'),
(33,'旧门新锁','换了锁，门里的东西就真的安全吗？'),
(34,'篱上牵牛','开给别人看的花，自己得了什么？'),
(35,'一棵歪树','长不直的那棵树，后来怎么样了？'),
(36,'田里的石头','绊脚的那块石头，为什么不搬走？'),
(37,'风来满袖','什么都抓不住的时候，手里还剩什么？'),
(38,'雨打芭蕉','同样的雨声，为什么有人烦有人睡？'),
(39,'炊烟直上','无风的日子，烟为什么也不肯散？'),
(40,'牛背上看书','一边赶路一边读，字会不会被颠散？'),
(41,'麦芒扎手','越靠近收成，越容易被什么扎到？'),
(42,'借来的犁','用别人的家伙，会不会耕出自己的路？'),
(43,'补过的瓦','漏过雨的地方，补上以后还怕什么？'),
(44,'井边的青苔','最湿最滑的地方，为什么草最先绿？'),
(45,'一担柴的重量','挑起来才知道，哪些是必须的？'),
(46,'半盏凉茶','茶凉了还喝不喝，跟将就有没有关系？'),
(47,'田埂上的字','写在地上没人看的话，算不算说过了？'),
(48,'归巢的雀','天黑了才回家，家里的灯还亮着吗？'),
(49,'谷雨前后','该播种的时候下不了雨，你等不等？'),
(50,'秋天的第一把火','烧掉旧茬的时候，心里舍不得什么？'),
(51,'磨钝的锄','钝了是换一把，还是再磨一磨？'),
(52,'河底的卵石','被水磨了那么久，为什么还有棱角？'),
(53,'窗纸破了','破了一个洞，是补上还是索性推开？'),
(54,'一窝蚂蚁','它们搬的那粒米，值不值得？'),
(55,'晚稻低头','越饱满越低头，人为什么相反？'),
(56,'山脚的磨坊','转得慢的地方，为什么留得住人？'),
(57,'路边野菊','没人种的花，是谁在照看？'),
(58,'旧年的种子','放了一年的种子，还能不能发芽？'),
(59,'霜降之后','第一场霜下来，你最先想到谁？'),
(60,'锅底的锅巴','最焦的那一层，为什么有人偏爱？');

-- 六种想法各十二句，按类型轮着落到地里
CREATE TEMPORARY TABLE seed_thought (dim VARCHAR(20) NOT NULL, idx TINYINT NOT NULL, content VARCHAR(500) NOT NULL, PRIMARY KEY (dim, idx));
INSERT INTO seed_thought (dim, idx, content) VALUES
('学科',0,'先把问题掰成两半，看看哪一半才是真问题。'),
('学科',1,'道理讲得通，落到土里未必长得出来。'),
('学科',2,'一个词用久了会变旧，得拿新的日子重新擦一擦。'),
('学科',3,'答案有时不在远处，在我们没敢问的那句话里。'),
('学科',4,'书上的因果是直的，地里的因果常常绕个弯。'),
('学科',5,'把为什么多问一层，脚下的地就松一寸。'),
('学科',6,'看得见的规律，都是从看不见的耐心里长出来的。'),
('学科',7,'一件事重复三遍，才看得出它是不是偶然。'),
('学科',8,'结论别下得太早，种子也要等一场雨。'),
('学科',9,'争论到最后，往往是在争同一个词的不同活法。'),
('学科',10,'会提问的人，等于在荒地里先开了一条沟。'),
('学科',11,'懂了不等于会了，会了还要看天时。'),
('行业',0,'做事的人先看脚下，管事的人先看天。'),
('行业',1,'快的办法用久了，会欠下慢的债。'),
('行业',2,'一行有一行的土性，照搬肥料不一定长苗。'),
('行业',3,'把小事做顺，比把大事说圆更难。'),
('行业',4,'账面上的收成，和仓里的收成不是一回事。'),
('行业',5,'赶工赶出来的东西，总在某个角落等着返工。'),
('行业',6,'熟客的一句闲话，有时比一张报表有用。'),
('行业',7,'门槛越低的地方，越要守住自己的准头。'),
('行业',8,'一个人扛不动的活，先分垄，再下锄。'),
('行业',9,'热闹的买卖散得快，回头客是慢火熬出来的。'),
('行业',10,'工具越顺手，越容易忘了它只是工具。'),
('行业',11,'先保住种子，再谈明年的收成。'),
('学生',0,'不会的题先放一放，去院子里走一圈。'),
('学生',1,'别人跑得快，不代表你的路也是那条。'),
('学生',2,'被老师说中的毛病，往往自己早就知道。'),
('学生',3,'分数像天气，能决定今天穿什么，决定不了一辈子。'),
('学生',4,'抄来的答案最省事，也最容易被忘掉。'),
('学生',5,'一门课学到最后，学的是怎么自己找路。'),
('学生',6,'怕出错的时候，先写下一个最笨的答案。'),
('学生',7,'同桌的一句提示，有时比整本参考书管用。'),
('学生',8,'年少时的笨功夫，后来都成了底子。'),
('学生',9,'不是每一分努力都当场结果，根在土里长。'),
('学生',10,'把喜欢的事留一点给明天，别一口气烧完。'),
('学生',11,'毕业以后才明白，最难的是给自己出题。'),
('社会人',0,'白天把自己交出去，晚上得留一小块给自己。'),
('社会人',1,'会说不的人，日子往往过得更清楚。'),
('社会人',2,'忙不是本事，知道为什么忙才是。'),
('社会人',3,'工资买走的是时间，买不走手上的手艺。'),
('社会人',4,'人情像田埂，平时要修，急时才走得通。'),
('社会人',5,'扛不住的时候，先找个能坐下来说话的人。'),
('社会人',6,'面子是给别人看的，里子得自己缝。'),
('社会人',7,'换一条路走，不一定是逃，也可能是绕开石头。'),
('社会人',8,'把日子过成账本，容易漏掉最值钱的那几页。'),
('社会人',9,'成年人的委屈，多半是没说出口的那半句。'),
('社会人',10,'稳定不是不动，是风来了还能站住。'),
('社会人',11,'留一点余钱，也留一点余力，荒年才不慌。'),
('老人',0,'年轻时觉得过不去的坎，如今看只是道田埂。'),
('老人',1,'记性差了，反而把不重要的事先忘了。'),
('老人',2,'一碗热粥的时间，比一整天的大道理长。'),
('老人',3,'人老了才懂，慢不是落后，是看得清。'),
('老人',4,'儿孙有儿孙的节气，催不得。'),
('老人',5,'旧物件舍不得扔，是舍不得那时的自己。'),
('老人',6,'话到嘴边留半句，不是怕，是知道了轻重。'),
('老人',7,'晒晒太阳，听听鸡叫，日子就有了底。'),
('老人',8,'走过很多路，最后想回的还是那扇门。'),
('老人',9,'身体先知道天要变，人得学会听它。'),
('老人',10,'争了一辈子，最后争的是一口顺气。'),
('老人',11,'把后事说清楚，是给活着的人留体面。'),
('幻想',0,'假如时间能倒流，我大概还是会在同一个岔口犹豫。'),
('幻想',1,'一百年后的孩子，会不会把稻田当成传说？'),
('幻想',2,'如果动物会说话，最先开口的可能是那头老牛。'),
('幻想',3,'平行世界的我，也许正在替我过没敢过的日子。'),
('幻想',4,'给月亮写一封信，邮差大概要走到天亮。'),
('幻想',5,'假如风有形状，篱笆就是它留下的笔迹。'),
('幻想',6,'会飞的房子不一定自由，可能只是没有根。'),
('幻想',7,'如果梦能存进坛子，你舍得开封吗？'),
('幻想',8,'另一个我如果更快乐，我该不该嫉妒他？'),
('幻想',9,'假如种子记得前世，它还会选这块地吗？'),
('幻想',10,'时间如果是一条河，我们都在摸同一块石头。'),
('幻想',11,'会消失的不是魔法，是我们不再相信的那部分。');

-- 一、风过篱笆：十六块地都开着口，风里再撒满两百片
INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u1, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  t.title, t.question, 4, 9, 'running', 'tree', NULL,
  DATE_SUB(NOW(), INTERVAL (n * 4 + 2) DAY), NULL
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 16 ORDER BY n;

INSERT INTO thoughts (session_id, dimension, content, level, created_at)
SELECT s.id,
  ELT(1 + MOD(k.n-1,6), '学科','行业','学生','社会人','老人','幻想'), st.content,
  FLOOR(k.n / 3) + 1, DATE_ADD(s.started_at, INTERVAL k.n HOUR)
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='风过篱笆'
JOIN seq k ON k.n <= 9
JOIN seed_thought st ON st.dim = ELT(1 + MOD(k.n-1,6), '学科','行业','学生','社会人','老人','幻想')
  AND st.idx = MOD(k.n + s.id, 12);

INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u1, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  t.title, t.question, 1, 1, 'finished', 'wind', NULL,
  DATE_SUB(NOW(), INTERVAL (n * 2 + 5) DAY), DATE_SUB(NOW(), INTERVAL (n * 2 + 4) DAY)
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 200 ORDER BY n;

INSERT INTO thoughts (session_id, dimension, content, level, created_at)
SELECT s.id,
  ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想'), st.content, 1, s.ended_at
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='风过篱笆'
JOIN seed_thought st ON st.dim = ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想')
  AND st.idx = MOD(s.id, 12)
WHERE s.placement='wind';

-- 二、土里长歌：五条树根下各十五棵，地上种满
INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u2, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  t.title, t.question, 1, 1, 'finished', 'ground', FLOOR((n-1)/15),
  DATE_SUB(NOW(), INTERVAL (n + 40) DAY), DATE_SUB(NOW(), INTERVAL (n + 39) DAY)
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 75 ORDER BY n;

INSERT INTO thoughts (session_id, dimension, content, level, created_at)
SELECT s.id,
  ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想'), st.content, 1, s.ended_at
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='土里长歌'
JOIN seed_thought st ON st.dim = ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想')
  AND st.idx = MOD(s.id, 12);

-- 三、五棵树下：主树六十，第二棵三十，第三棵二十，第四棵二十五，第五棵三十
INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u3, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  t.title, t.question, 1, 1, 'finished', 'tree', NULL,
  DATE_SUB(NOW(), INTERVAL (n * 2 + 60) DAY), DATE_SUB(NOW(), INTERVAL (n * 2 + 59) DAY)
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 165 ORDER BY n;

INSERT INTO thoughts (session_id, dimension, content, level, created_at)
SELECT s.id,
  ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想'), st.content, 1, s.ended_at
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='五棵树下'
JOIN seed_thought st ON st.dim = ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想')
  AND st.idx = MOD(s.id, 12);

-- 四、藤爬半坡：一、三、五棵树种满，二、四两棵各十片；
-- 第四棵里有一片挖到第三百层，叶子下挂三百滴，够藤一直垂到坡底
INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u4, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  IF(n=91, '藤爬到月下', t.title),
  IF(n=91, '一根藤从第四棵树的腰上垂下来，垂了三百年，还没垂到底。', t.question),
  IF(n=91, 300, 1), IF(n=91, 300, 1), 'finished', 'tree',
  CASE WHEN n <= 60 THEN -1 WHEN n <= 70 THEN -2 WHEN n <= 90 THEN -3 WHEN n <= 100 THEN -4 ELSE -5 END,
  DATE_SUB(NOW(), INTERVAL (n * 3 + 20) DAY), DATE_SUB(NOW(), INTERVAL (n * 3 + 19) DAY)
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 130 ORDER BY n;

INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u4, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  t.title, t.question, 1, 1, 'finished', 'ground', FLOOR((n-1)/15),
  DATE_SUB(NOW(), INTERVAL (n + 80) DAY), DATE_SUB(NOW(), INTERVAL (n + 79) DAY)
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 75 ORDER BY n;

INSERT INTO sessions (user_id, topic_id, topic_name, title, question, level, thought_count, status, placement, branch, started_at, ended_at)
SELECT @u4, 1 + MOD(n-1,16),
  ELT(1 + MOD(n-1,16), '哲学','心理学','经济学','生物学','历史学','互联网','教育','医疗','农业','学生','社会人','老人','如果时间可以倒流','一百年后的城市','如果动物会说话','平行世界的我'),
  t.title, t.question, 1, 1, 'finished', 'wind', NULL,
  DATE_SUB(NOW(), INTERVAL (n * 2 + 100) DAY), DATE_SUB(NOW(), INTERVAL (n * 2 + 99) DAY)
FROM seq JOIN seed_title t ON t.id = 1 + MOD(n-1,60) WHERE n <= 200 ORDER BY n;

-- 普通叶子各一滴
INSERT INTO thoughts (session_id, dimension, content, level, created_at)
SELECT s.id,
  ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想'), st.content, 1, s.ended_at
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='藤爬半坡'
JOIN seed_thought st ON st.dim = ELT(1 + MOD(s.id,6), '学科','行业','学生','社会人','老人','幻想')
  AND st.idx = MOD(s.id, 12)
WHERE s.thought_count=1;

-- 那片三百层的叶子：一滴一层，层数就是水滴数
INSERT INTO thoughts (session_id, dimension, content, level, created_at)
SELECT s.id,
  ELT(1 + MOD(k.n,6), '学科','行业','学生','社会人','老人','幻想'), st.content, k.n,
  DATE_ADD(s.started_at, INTERVAL k.n MINUTE)
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='藤爬半坡'
JOIN seq k ON k.n <= 300
JOIN seed_thought st ON st.dim = ELT(1 + MOD(k.n,6), '学科','行业','学生','社会人','老人','幻想')
  AND st.idx = MOD(k.n + 3, 12)
WHERE s.title='藤爬到月下' AND s.level=300;

-- 那棵长藤上也压过几层，回看时一并摊开，不翻页
INSERT INTO milestones (session_id, level, title, note, snapshot, created_at)
SELECT s.id, k.n,
  ELT(1 + MOD(k.n,6), '土松了一寸','藤尖碰到水','石头让了路','听见蚯蚓翻身','垄沟积了露','又见一层黑土'),
  ELT(1 + MOD(k.n,4), '这一铲下去，土是凉的。','藤从指缝里滑过去。','再往下，得侧着身子。','下面好像还有路。'),
  JSON_OBJECT('level', k.n, 'thought_count', k.n, 'thoughts', JSON_ARRAY(
    JSON_OBJECT('id', 0, 'dimension', '学科', 'content', '这一层土比上一层更暗，也更软。', 'level', k.n),
    JSON_OBJECT('id', 0, 'dimension', '幻想', 'content', '藤尖碰到石头，绕了一下，又往下走。', 'level', k.n)
  )),
  DATE_ADD(s.started_at, INTERVAL k.n MINUTE)
FROM sessions s
JOIN users u ON u.id=s.user_id AND u.username='藤爬半坡'
JOIN seq k ON k.n IN (10,40,80,120,160,200,240,300)
WHERE s.title='藤爬到月下' AND s.level=300;

DROP TEMPORARY TABLE seq;
DROP TEMPORARY TABLE seed_title;
DROP TEMPORARY TABLE seed_thought;
