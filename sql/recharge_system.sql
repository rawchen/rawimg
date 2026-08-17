-- =============================================
-- 充值系统数据库表结构
-- 创建日期: 2026-08-17
-- =============================================

-- 1. 充值套餐表
CREATE TABLE IF NOT EXISTS `recharge_package` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `amount` DECIMAL(10, 2) NOT NULL COMMENT '充值金额（元）',
    `credit_amount` DECIMAL(10, 2) NOT NULL COMMENT '到账金额（元）',
    `bonus_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '赠送金额（元）',
    `recommended` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐：1-是，0-否',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
    `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用，0-禁用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_amount` (`amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值套餐表';

-- 2. 充值订单表
CREATE TABLE IF NOT EXISTS `recharge_order` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `order_no` VARCHAR(100) NOT NULL COMMENT '订单号',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `amount` DECIMAL(10, 2) NOT NULL COMMENT '充值金额（元）',
    `credit_amount` DECIMAL(10, 2) NOT NULL COMMENT '到账金额（元）',
    `bonus_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '赠送金额（元）',
    `paid_amount` DECIMAL(10, 2) NOT NULL COMMENT '实付金额（元）',
    `payment_method` VARCHAR(20) NOT NULL COMMENT '支付方式：WECHAT-微信，ALIPAY-支付宝',
    `payment_channel` VARCHAR(50) DEFAULT NULL COMMENT '支付渠道描述',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '订单状态：PENDING-待支付，SUCCESS-成功，EXPIRED-已过期，FAILED-失败',
    `qr_code_url` VARCHAR(500) DEFAULT NULL COMMENT '二维码URL',
    `pay_url` VARCHAR(500) DEFAULT NULL COMMENT '支付链接（二维码识别后的内容）',
    `transaction_id` VARCHAR(100) DEFAULT NULL COMMENT '第三方支付单号',
    `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
    `expire_time` DATETIME NOT NULL COMMENT '订单过期时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值订单表';

-- 3. 初始化充值套餐数据
INSERT INTO `recharge_package` (`amount`, `credit_amount`, `bonus_amount`, `recommended`, `sort_order`, `enabled`) VALUES
(10.00, 10.00, 0.00, 0, 1, 1),
(30.00, 30.00, 0.00, 0, 2, 1),
(100.00, 120.00, 20.00, 1, 3, 1),
(500.00, 560.00, 60.00, 0, 4, 1)
ON DUPLICATE KEY UPDATE credit_amount=VALUES(credit_amount), bonus_amount=VALUES(bonus_amount);
