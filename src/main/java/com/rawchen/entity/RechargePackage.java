package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值套餐实体
 */
@Data
@TableName("recharge_package")
public class RechargePackage {

    @TableId(type = IdType.AUTO)
    private Long id;

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
     * 是否推荐
     */
    private Boolean recommended;

    /**
     * 排序
     */
    private Integer sortOrder;

    /**
     * 是否启用
     */
    private Boolean enabled;

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
