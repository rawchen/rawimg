-- 测试和修复脚本
-- 1. 检查 user_balance 表是否存在
SELECT COUNT(*) as user_balance_count FROM user_balance;

-- 2. 为所有现有用户创建余额记录（如果不存在）
INSERT IGNORE INTO `user_balance` (`user_id`, `balance`, `total_recharged`, `total_consumed`)
SELECT id, 10.00, 10.00, 0.00 FROM sys_user WHERE deleted = 0;

-- 3. 再次检查
SELECT ub.*, su.username FROM user_balance ub
LEFT JOIN sys_user su ON ub.user_id = su.id
LIMIT 10;

-- 4. 检查模型价格表
SELECT * FROM model_price LIMIT 10;
