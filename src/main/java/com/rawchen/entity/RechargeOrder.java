package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值订单实体
 */
@Data
@TableName("recharge_order")
public class RechargeOrder {

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 订单号
     */
    private String orderNo;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 充值金额（元）
     */
    private BigDecimal amount;

    /**
     * 到账金额（元）
     */
    private BigDecimal creditAmount;

    /**
     * 赠送金额（元）
     */
    private BigDecimal bonusAmount;

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
     * 二维码URL
     */
    @JsonIgnore
    private String qrCodeUrl;

    /**
     * 支付链接（二维码识别后的内容）
     */
    private String payUrl;

    /**
     * 第三方支付单号
     */
    private String transactionId;

    /**
     * 支付时间
     */
    private LocalDateTime payTime;

    /**
     * 订单过期时间
     */
    private LocalDateTime expireTime;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /**
     * 更新时间
     */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    /**
     * 逻辑删除
     */
    @TableLogic
    private Integer deleted;
}
