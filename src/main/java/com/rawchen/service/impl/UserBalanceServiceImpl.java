package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.dto.BalanceStatsResponse;
import com.rawchen.dto.ConsumeLogStatsResponse;
import com.rawchen.entity.UserBalance;
import com.rawchen.mapper.UserBalanceMapper;
import com.rawchen.service.ConsumeLogService;
import com.rawchen.service.UserBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 用户余额服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserBalanceServiceImpl extends ServiceImpl<UserBalanceMapper, UserBalance> implements UserBalanceService {

    private final ConsumeLogService consumeLogService;

    @Override
    public UserBalance getByUserId(Long userId) {
        LambdaQueryWrapper<UserBalance> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserBalance::getUserId, userId);
        UserBalance balance = getOne(wrapper);

        // 如果用户没有余额记录，创建一个
        if (balance == null) {
            balance = new UserBalance();
            balance.setUserId(userId);
            balance.setBalance(BigDecimal.ZERO);
            balance.setTotalRecharged(BigDecimal.ZERO);
            balance.setTotalConsumed(BigDecimal.ZERO);
            save(balance);
        }

        return balance;
    }

    @Override
    @Transactional
    public UserBalance recharge(Long userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("充值金额必须大于0");
        }

        UserBalance balance = getByUserId(userId);
        balance.setBalance(balance.getBalance().add(amount));
        balance.setTotalRecharged(balance.getTotalRecharged().add(amount));
        updateById(balance);

        log.info("用户 {} 充值 {} 元，当前余额 {}", userId, amount, balance.getBalance());
        return balance;
    }

    @Override
    @Transactional
    public boolean deduct(Long userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("扣费金额必须大于0");
        }

        UserBalance balance = getByUserId(userId);

        // 检查余额是否充足
        if (balance.getBalance().compareTo(amount) < 0) {
            log.warn("用户 {} 余额不足，当前余额 {}，需要 {}", userId, balance.getBalance(), amount);
            return false;
        }

        // 扣费
        balance.setBalance(balance.getBalance().subtract(amount));
        balance.setTotalConsumed(balance.getTotalConsumed().add(amount));
        updateById(balance);

        log.info("用户 {} 扣费 {} 元，当前余额 {}", userId, amount, balance.getBalance());
        return true;
    }

    @Override
    public boolean checkBalance(Long userId, BigDecimal amount) {
        UserBalance balance = getByUserId(userId);
        return balance.getBalance().compareTo(amount) >= 0;
    }

    @Override
    public BalanceStatsResponse getStats(Long userId) {
        UserBalance balance = getByUserId(userId);

        BalanceStatsResponse response = new BalanceStatsResponse();
        response.setUserId(userId);
        response.setBalance(balance.getBalance());
        response.setTotalRecharged(balance.getTotalRecharged());
        response.setTotalConsumed(balance.getTotalConsumed());

        // 获取今日消费统计
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        ConsumeLogStatsResponse todayStats = consumeLogService.getStats(userId, startOfDay, LocalDateTime.now());

        response.setTodayConsumed(todayStats.getTotalCost());
        response.setTodayOperations(todayStats.getTotalOperations());

        return response;
    }
}
