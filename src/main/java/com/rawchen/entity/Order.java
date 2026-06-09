package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName(value = "orders", autoResultMap = true)
public class Order extends BaseEntity {

    @TableField("order_no")
    private String orderNo;

    @TableField("user_id")
    private Long userId;

    private BigDecimal amount;

    @TableField("payment_status")
    private OrderStatus status = OrderStatus.PENDING;

    @TableField("payment_method")
    private PaymentMethod paymentMethod;

    @TableField("order_type")
    private OrderType orderType;

    @TableField("vip_days")
    private Integer vipDays;

    private Integer points;

    @TableField("trade_no")
    private String transactionId;

    @TableField("card_key_id")
    private Long cardKeyId;

    @TableField("paid_at")
    private LocalDateTime payTime;

    public enum OrderStatus {
        PENDING, PAID, CANCELLED, REFUNDED
    }

    public enum PaymentMethod {
        ALIPAY, WECHAT, CARD_KEY
    }

    public enum OrderType {
        VIP, POINTS
    }
}
