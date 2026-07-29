package com.rawchen.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 用户余额统计响应
 */
@Data
public class BalanceStatsResponse {

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 当前余额
     */
    private BigDecimal balance;

    /**
     * 累计充值金额
     */
    private BigDecimal totalRecharged;

    /**
     * 累计消费金额
     */
    private BigDecimal totalConsumed;

    /**
     * 今日消费金额
     */
    private BigDecimal todayConsumed;

    /**
     * 今日操作次数
     */
    private Integer todayOperations;
}
