-- =============================================
-- 添加 pay_url 字段到 recharge_order 表
-- 创建日期: 2026-08-17
-- =============================================

ALTER TABLE `recharge_order` 
ADD COLUMN `pay_url` VARCHAR(500) DEFAULT NULL COMMENT '支付链接（二维码识别后的内容）' 
AFTER `qr_code_url`;
