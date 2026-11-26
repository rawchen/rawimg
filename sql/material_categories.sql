-- ============================================================================
-- 素材库分类数据（由 sql/material_library.sql 提取）
-- 导入顺序: 先本文件，再 material_assets.sql
-- ============================================================================

SET NAMES utf8mb4;
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
