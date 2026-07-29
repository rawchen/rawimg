package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 模型价格配置实体类（简化版 - 按模型固定定价）
 */
@Data
@TableName(value = "model_price", autoResultMap = true)
public class ModelPrice extends BaseEntity {

    /**
     * 模型代码（如 gpt-image-2）
     */
    @TableField("model_code")
    private String modelCode;

    /**
     * 模型名称（如 GPT Image 2）
     */
    @TableField("model_name")
    private String modelName;

    /**
     * 提供商（如 OpenAI、Google）
     */
    private String provider;

    /**
     * 单次调用价格（元）
     */
    private BigDecimal price;

    /**
     * 描述说明
     */
    private String description;

    /**
     * 是否启用：1-启用，0-禁用
     */
    private Boolean enabled;

    /**
     * 排序顺序
     */
    @TableField("sort_order")
    private Integer sortOrder;
}
