package com.rawchen.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值订单DTO
 */
@Data
public class RechargeOrderDTO {

    private Long id;

    /**
     * 订单号
     */
    private String orderNo;

    /**
     * 充值金额（元）
     */
    private BigDecimal amount;

    /**
     * 到账金额（元）
     */
    private BigDecimal creditAmount;

    /**
     * 实付金额（元）
     */
    private BigDecimal paidAmount;

    /**
     * 支付方式：WECHAT-微信，ALIPAY-支付宝
     */
    private String paymentMethod;

    /**
     * 支付渠道描述
     */
    private String paymentChannel;

    /**
     * 订单状态：PENDING-待支付，SUCCESS-成功，EXPIRED-已过期，FAILED-失败
     */
    private String status;

    /**
     * 支付URL
     */
    private String payUrl;

    /**
     * 过期时间
     */
    private LocalDateTime expireTime;

    /**
     * 创建时间
     */
    private LocalDateTime createTime;

    /**
     * 支付时间
     */
    private LocalDateTime payTime;
}
