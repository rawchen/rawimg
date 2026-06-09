package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * VIP套餐实体类
 */
@Data
@TableName(value = "vip_package", autoResultMap = true)
public class VipPackage extends BaseEntity {

    /**
     * 套餐标识（如：WEEK, MONTH, YEAR）
     */
    @TableField("package_code")
    private String packageCode;

    /**
     * 套餐名称（如：周卡VIP, 月卡VIP, 年卡VIP）
     */
    @TableField("package_name")
    private String packageName;

    /**
     * VIP天数
     */
    private Integer days;

    /**
     * 每日下载次数
     */
    @TableField("daily_download_count")
    private Integer dailyDownloadCount;

    /**
     * 价格
     */
    private BigDecimal price;

    /**
     * 排序顺序（数字越小越靠前）
     */
    @TableField("sort_order")
    private Integer sortOrder;

    /**
     * 是否热门
     */
    private Boolean popular;

    /**
     * 是否启用
     */
    private Boolean enabled;

    /**
     * 购买链接
     */
    @TableField("purchase_url")
    private String purchaseUrl;

    /**
     * 描述
     */
    private String description;
}
