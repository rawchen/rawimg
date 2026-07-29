package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 用户余额实体类
 */
@Data
@TableName(value = "user_balance", autoResultMap = true)
public class UserBalance extends BaseEntity {

    /**
     * 用户ID
     */
    @TableField("user_id")
    private Long userId;

    /**
     * 余额（元）
     */
    private BigDecimal balance;

    /**
     * 累计充值金额
     */
    @TableField("total_recharged")
    private BigDecimal totalRecharged;

    /**
     * 累计消费金额
     */
    @TableField("total_consumed")
    private BigDecimal totalConsumed;
}
