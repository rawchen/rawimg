package com.rawchen.vo;

import lombok.Data;

/**
 * 素材库分类VO（带素材数量）
 */
@Data
public class MaterialCategoryVO {

    private String groupType;
    private String libraryType;
    private String categoryCode;
    private String categoryName;
    private String categoryNameOrigin;
    private Integer sortOrder;
    private Integer status;

    /**
     * 该分类下的素材数量
     */
    private Long assetCount;
}
