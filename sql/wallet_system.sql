-- =============================================
-- 钱包余额系统数据库表结构 V2
-- 创建日期: 2026-07-29
-- 说明: 按模型固定定价，不区分操作类型
-- =============================================

-- 1. 用户余额表
CREATE TABLE IF NOT EXISTS `user_balance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '余额（元）',
    `total_recharged` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '累计充值金额',
    `total_consumed` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '累计消费金额',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户余额表';

-- 2. 模型价格配置表（简化版 - 按模型固定定价）
DROP TABLE IF EXISTS `model_price`;
CREATE TABLE `model_price` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `model_code` VARCHAR(100) NOT NULL COMMENT '模型代码（如 gpt-image-2）',
    `model_name` VARCHAR(100) NOT NULL COMMENT '模型名称（如 GPT Image 2）',
    `provider` VARCHAR(50) NOT NULL COMMENT '提供商（如 OpenAI、Google）',
    `price` DECIMAL(10, 4) NOT NULL COMMENT '单次调用价格（元）',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述说明',
    `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用，0-禁用',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_model_code` (`model_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型价格配置表';

-- 3. 消费日志表
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

-- 4. 初始化模型价格数据
INSERT INTO `model_price` (`model_code`, `model_name`, `provider`, `price`, `description`, `enabled`, `sort_order`) VALUES
('gemini-2.5-flash-image', 'Gemini 2.5 Flash Image', 'Google', 0.06, 'Gemini 2.5 图像生成（1K分辨率，默认使用）', 1, 1),
('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image Preview', 'Google', 0.60, 'Gemini 3.1 图像生成预览版（1K分辨率）', 1, 2),
('gemini-3.1-flash-image-preview-2k', 'Gemini 3.1 Flash Image Preview 2K', 'Google', 0.60, 'Gemini 3.1 图像生成 2K分辨率', 1, 3),
('gemini-3.1-flash-image-preview-4k', 'Gemini 3.1 Flash Image Preview 4K', 'Google', 0.80, 'Gemini 3.1 图像生成 4K分辨率', 1, 4),
('gpt-image-2', 'GPT Image 2', 'OpenAI', 0.04, 'GPT-4 图像生成模型（1K分辨率）', 1, 5),
('gpt-image-2-2k', 'GPT Image 2 (2K)', 'OpenAI', 0.20, 'GPT-4 图像生成模型（2K分辨率）', 1, 6),
('gpt-image-2-4k', 'GPT Image 2 (4K)', 'OpenAI', 0.52, 'GPT-4 图像生成模型（4K分辨率）', 1, 7)
ON DUPLICATE KEY UPDATE price=VALUES(price), description=VALUES(description);

-- 5. 为现有用户创建余额记录
INSERT INTO `user_balance` (`user_id`, `balance`, `total_recharged`, `total_consumed`)
SELECT id, 0.00, 0.00, 0.00 FROM sys_user WHERE deleted = 0
ON DUPLICATE KEY UPDATE user_id = user_id;
