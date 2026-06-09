package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 卡密实体类
 */
@Data
@TableName(value = "card_key", autoResultMap = true)
public class CardKey extends BaseEntity {

    @TableField("card_code")
    private String cardCode;

    @TableField("card_type")
    private CardType cardType;

    @TableField("card_value")
    private Integer cardValue;

    private BigDecimal amount;

    private CardStatus status = CardStatus.UNUSED;

    @TableField("batch_no")
    private String batchNo;

    @TableField("used_by")
    private Long usedBy;

    @TableField("used_at")
    private LocalDateTime usedAt;

    @TableField("order_id")
    private Long orderId;

    @TableField("expire_time")
    private LocalDateTime expireTime;

    private String remark;

    /**
     * 卡类型枚举
     */
    public enum CardType {
        WEEK("周卡", 7),
        MONTH("月卡", 30),
        YEAR("年卡", 365),
        POINTS("积分", 0);

        private final String name;
        private final int defaultDays;

        CardType(String name, int defaultDays) {
            this.name = name;
            this.defaultDays = defaultDays;
        }

        public String getName() {
            return name;
        }

        public int getDefaultDays() {
            return defaultDays;
        }
    }

    /**
     * 卡状态枚举
     */
    public enum CardStatus {
        UNUSED("未使用"),
        USED("已使用"),
        EXPIRED("已过期");

        private final String name;

        CardStatus(String name) {
            this.name = name;
        }

        public String getName() {
            return name;
        }
    }
}
