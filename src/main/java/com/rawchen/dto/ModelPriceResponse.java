package com.rawchen.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 模型价格响应DTO（简化版）
 */
@Data
public class ModelPriceResponse {

    private Long id;

    /**
     * 模型代码
     */
    private String modelCode;

    /**
     * 模型名称
     */
    private String modelName;

    /**
     * 提供商
     */
    private String provider;

    /**
     * 单次调用价格
     */
    private BigDecimal price;

    /**
     * 描述
     */
    private String description;

    /**
     * 是否启用
     */
    private Boolean enabled;

    /**
     * 排序
     */
    private Integer sortOrder;
}
