package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.BalanceStatsResponse;
import com.rawchen.entity.UserBalance;

import java.math.BigDecimal;

/**
 * 用户余额服务接口
 */
public interface UserBalanceService extends IService<UserBalance> {

    /**
     * 获取用户余额
     *
     * @param userId 用户ID
     * @return 余额信息
     */
    UserBalance getByUserId(Long userId);

    /**
     * 充值余额
     *
     * @param userId 用户ID
     * @param amount 充值金额
     * @return 更新后的余额
     */
    UserBalance recharge(Long userId, BigDecimal amount);

    /**
     * 扣费
     *
     * @param userId 用户ID
     * @param amount 扣费金额
     * @return 是否成功
     */
    boolean deduct(Long userId, BigDecimal amount);

    /**
     * 检查余额是否充足
     *
     * @param userId 用户ID
     * @param amount 需要的金额
     * @return 是否充足
     */
    boolean checkBalance(Long userId, BigDecimal amount);

    /**
     * 获取用户余额统计信息
     *
     * @param userId 用户ID
     * @return 统计信息
     */
    BalanceStatsResponse getStats(Long userId);
}
