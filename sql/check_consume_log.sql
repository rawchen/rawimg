-- 检查消费日志表和数据
-- 1. 检查 consume_log 表是否存在
SHOW TABLES LIKE 'consume_log';

-- 2. 如果不存在，创建表
CREATE TABLE IF NOT EXISTS `consume_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `task_id` VARCHAR(100) DEFAULT NULL COMMENT '任务ID（异步任务）',
    `operation_type` VARCHAR(20) NOT NULL COMMENT '操作类型：create-创作，beauty-美颜，expand-扩图，matting-抠图等',
    `model_code` VARCHAR(100) NOT NULL COMMENT '使用的模型代码',
    `model_name` VARCHAR(100) DEFAULT NULL COMMENT '模型名称',
    `status` VARCHAR(20) NOT NULL COMMENT '状态：pending-处理中，success-成功，failed-失败',
    `image_size` VARCHAR(20) DEFAULT NULL COMMENT '图片尺寸，如 1920x1080',
    `total_cost` DECIMAL(10, 4) NOT NULL COMMENT '本次花费（元）',
    `duration_ms` INT DEFAULT NULL COMMENT '任务耗时（毫秒）',
    `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
    `result_url` VARCHAR(500) DEFAULT NULL COMMENT '结果图片URL',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_task_id` (`task_id`),
    KEY `idx_operation_type` (`operation_type`),
    KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消费日志表';

-- 3. 查看最新的消费日志
SELECT
    cl.id,
    cl.user_id,
    su.username,
    cl.task_id,
    cl.operation_type,
    cl.model_code,
    cl.status,
    cl.total_cost,
    cl.create_time
FROM consume_log cl
LEFT JOIN sys_user su ON cl.user_id = su.id
ORDER BY cl.create_time DESC
LIMIT 10;

-- 4. 查看今日消费统计
SELECT
    user_id,
    COUNT(*) as operation_count,
    SUM(total_cost) as total_cost
FROM consume_log
WHERE DATE(create_time) = CURDATE()
GROUP BY user_id;
