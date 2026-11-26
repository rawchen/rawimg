-- ============================================================================
-- 素材库（人物 / 服装 / 姿态）
-- 数据来源：
--   人物素材库：https://ai-portrait-gallery.pages.dev      (人脸 face / 造型 styling)
--   服装素材库：https://ai-costume-gallery.pages.dev        (写实 costume_real)
--                https://ai-costume-anime-gallery.pages.dev  (动漫 costume_anime)
--   姿态库：    https://ai-pose-depth-gallery.pages.dev      (仅抓取正面视角)
-- 图片统一下载后存放到正式环境 OSS，thumb_url 为预览图（webp/jpg），full_url 为正式图（png）
-- ============================================================================

-- ----------------------------
-- 素材分类表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `material_category` (
  `id`                 BIGINT       NOT NULL AUTO_INCREMENT,
  `group_type`         VARCHAR(32)  NOT NULL COMMENT '大类: portrait=人物库 costume=服装库 pose=姿态库',
  `library_type`       VARCHAR(32)  NOT NULL COMMENT '子库: portrait_face/portrait_styling/costume_real/costume_anime/pose',
  `category_code`      VARCHAR(64)  NOT NULL COMMENT '分类编码(英文, 如 short/spring/full_sexy)',
  `category_name`      VARCHAR(128) NOT NULL COMMENT '分类名称(中文)',
  `category_name_origin` VARCHAR(128) DEFAULT NULL COMMENT '分类原名(日文/英文)',
  `sort_order`         INT          NOT NULL DEFAULT 0 COMMENT '排序值, 越小越靠前',
  `status`             TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=停用',
  `create_time`        DATETIME     DEFAULT NULL,
  `update_time`        DATETIME     DEFAULT NULL,
  `deleted`            TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category` (`library_type`, `category_code`, `deleted`),
  KEY `idx_group` (`group_type`, `status`, `sort_order`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '素材库分类';

-- ----------------------------
-- 素材表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `material_asset` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `group_type`    VARCHAR(32)  NOT NULL COMMENT '大类: portrait/costume/pose',
  `library_type`  VARCHAR(32)  NOT NULL COMMENT '子库: portrait_face/portrait_styling/costume_real/costume_anime/pose',
  `category_code` VARCHAR(64)  NOT NULL COMMENT '分类编码',
  `category_name` VARCHAR(128) NOT NULL COMMENT '分类名称(中文)',
  `source_id`     VARCHAR(64)  NOT NULL COMMENT '来源站素材ID',
  `title`         VARCHAR(512) NOT NULL COMMENT '中文标题',
  `title_origin`  VARCHAR(512) DEFAULT NULL COMMENT '原始标题(日文/英文)',
  `thumb_url`     VARCHAR(512) DEFAULT NULL COMMENT '预览图URL(webp/jpg)',
  `preview_url`   VARCHAR(512) DEFAULT NULL COMMENT '预览图URL(webp, 用于列表展示)',
  `full_url`      VARCHAR(512) DEFAULT NULL COMMENT '正式图URL(png)',
  `width`         INT          DEFAULT NULL COMMENT '原图宽度',
  `height`        INT          DEFAULT NULL COMMENT '原图高度',
  `extra`         VARCHAR(1024) DEFAULT NULL COMMENT '扩展信息JSON(发长/角度/姿势编号/服装关键词等)',
  `sort_order`    INT          NOT NULL DEFAULT 0 COMMENT '排序值',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=停用',
  `create_time`   DATETIME     DEFAULT NULL,
  `update_time`   DATETIME     DEFAULT NULL,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asset` (`library_type`, `source_id`, `deleted`),
  KEY `idx_library_category` (`library_type`, `category_code`, `status`, `sort_order`),
  KEY `idx_group_status` (`group_type`, `status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '素材库素材';

-- ----------------------------
-- 初始化分类数据
-- ----------------------------
INSERT INTO `material_category`
(`group_type`, `library_type`, `category_code`, `category_name`, `category_name_origin`, `sort_order`, `status`, `create_time`, `update_time`, `deleted`)
VALUES
-- 人物素材库 - 人脸
('portrait', 'portrait_face', 'short',   '短发',   'ショート',   1, 1, NOW(), NOW(), 0),
('portrait', 'portrait_face', 'medium',  '中长发', 'ミディアム', 2, 1, NOW(), NOW(), 0),
('portrait', 'portrait_face', 'semilong','半长发', 'セミロング', 3, 1, NOW(), NOW(), 0),
('portrait', 'portrait_face', 'long',    '长发',   'ロング',     4, 1, NOW(), NOW(), 0),
-- 人物素材库 - 造型
('portrait', 'portrait_styling', 'short',   '短发',   'ショート',   1, 1, NOW(), NOW(), 0),
('portrait', 'portrait_styling', 'medium',  '中长发', 'ミディアム', 2, 1, NOW(), NOW(), 0),
('portrait', 'portrait_styling', 'semilong','半长发', 'セミロング', 3, 1, NOW(), NOW(), 0),
('portrait', 'portrait_styling', 'long',    '长发',   'ロング',     4, 1, NOW(), NOW(), 0),
-- 服装素材库 - 写实
('costume', 'costume_real', 'spring',    '春季',   '春',          1, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'summer',    '夏季',   '夏',          2, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'autumn',    '秋季',   '秋',          3, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'winter',    '冬季',   '冬',          4, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'lingerie',  '内衣',   'ランジェリー', 5, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'party',     '派对',   'パーティ',    6, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'swimsuit',  '泳装',   '水着',        7, 1, NOW(), NOW(), 0),
('costume', 'costume_real', 'sexy',      '性感风', 'セクシー',    8, 1, NOW(), NOW(), 0),
-- 服装素材库 - 动漫
('costume', 'costume_anime', 'spring',    '春季',   '春',          1, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'summer',    '夏季',   '夏',          2, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'autumn',    '秋季',   '秋',          3, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'winter',    '冬季',   '冬',          4, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'lingerie',  '内衣',   'ランジェリー', 5, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'party',     '派对',   'パーティ',    6, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'swimsuit',  '泳装',   '水着',        7, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'sexy',      '性感风', 'セクシー',    8, 1, NOW(), NOW(), 0),
-- 服装素材库 - 动漫细分分类(源站更新后可能出现)
('costume', 'costume_anime', 'school_uniform', '制服·学生',   '制服・学生',   20, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'casual_spring_summer', '休闲(春夏)', 'カジュアル(春夏)', 21, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'casual_autumn_winter', '休闲(秋冬)', 'カジュアル(秋冬)', 22, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'office',       '精致·办公', 'きれいめ・オフィス', 23, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'dress_party',  '礼服·派对', 'ドレス・パーティ', 24, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'kimono',       '和服',      '和服',         25, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'sports',       '运动·社团', 'スポーツ・部活', 27, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'occupation',   '职业·Cosplay', '職業・コスプレ', 28, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'fantasy',      '幻想',      'ファンタジー', 29, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'loungewear',   '居家服·睡衣', '部屋着・パジャマ', 30, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'event',        '活动·季节', 'イベント・季節', 31, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'idol',         '偶像·舞台', 'アイドル・ステージ', 32, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'gothic',       '哥特·地雷系', 'ゴスロリ・地雷系', 33, 1, NOW(), NOW(), 0),
('costume', 'costume_anime', 'military',     '军装·科幻', 'ミリタリー・SF', 34, 1, NOW(), NOW(), 0),
-- 姿态库
('pose', 'pose', 'full_sexy',  '全身·单人·性感风', '全身1人・セクシー系', 1, 1, NOW(), NOW(), 0),
('pose', 'pose', 'full_single','全身·单人·标准型', '全身1人・標準系',     2, 1, NOW(), NOW(), 0),
('pose', 'pose', 'upper',      '上半身·单人',     '上半身1人',           3, 1, NOW(), NOW(), 0),
('pose', 'pose', 'pair',       '双人互动',         '2人絡み',             4, 1, NOW(), NOW(), 0);
