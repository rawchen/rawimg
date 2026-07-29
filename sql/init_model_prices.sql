-- 初始化模型价格数据
-- 检查并插入模型价格数据

-- 1. 确保表存在
CREATE TABLE IF NOT EXISTS `model_price` (
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

-- 2. 插入初始数据（使用 INSERT IGNORE 避免重复）
INSERT IGNORE INTO `model_price` (`model_code`, `model_name`, `provider`, `price`, `description`, `enabled`, `sort_order`) VALUES
('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image Preview', 'Google', 0.60, 'Gemini 3.1 图像生成预览版', 1, 1),
('gemini-3.1-flash-image-preview-2k', 'Gemini 3.1 Flash Image Preview 2K', 'Google', 0.60, 'Gemini 3.1 图像生成 2K分辨率', 1, 2),
('gemini-3.1-flash-image-preview-4k', 'Gemini 3.1 Flash Image Preview 4K', 'Google', 0.80, 'Gemini 3.1 图像生成 4K分辨率', 1, 3),
('gemini-2.5-flash-image', 'Gemini 2.5 Flash Image', 'Google', 0.06, 'Gemini 2.5 图像生成', 1, 4),
('gpt-image-2', 'GPT Image 2', 'OpenAI', 0.04, 'GPT-4 图像生成模型', 1, 5);

-- 3. 验证数据
SELECT * FROM model_price ORDER BY sort_order;
