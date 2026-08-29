-- 为 image_task 表添加音乐封面相关字段
-- 执行时间：2026-08-29

USE rawimg;

-- 添加 song_id 字段（歌曲ID，用于音乐封面任务）
ALTER TABLE image_task ADD COLUMN song_id VARCHAR(50) COMMENT '歌曲ID（音乐封面任务专用）';

-- 添加 song_name 字段（歌曲名称，用于音乐封面任务）
ALTER TABLE image_task ADD COLUMN song_name VARCHAR(255) COMMENT '歌曲名称（音乐封面任务专用）';

-- 验证字段是否添加成功
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'rawimg' 
AND TABLE_NAME = 'image_task' 
AND COLUMN_NAME IN ('song_id', 'song_name');
