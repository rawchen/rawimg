package com.rawchen.dto;

import lombok.Data;

/**
 * 素材分类DTO（后台新增/编辑分类）
 */
@Data
public class MaterialCategoryDTO {

    /**
     * 分类ID，为空表示新增
     */
    private Long id;

    private String groupType;

    private String libraryType;

    private String categoryCode;

    /**
     * 分类名称（中文）
     */
    private String categoryName;

    /**
     * 分类原名（日文/英文）
     */
    private String categoryNameOrigin;

    private Integer sortOrder;

    /**
     * 状态: 1=启用 0=停用
     */
    private Integer status;
}
