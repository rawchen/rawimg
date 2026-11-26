package com.rawchen.dto;

import lombok.Data;

/**
 * 分类素材数量聚合结果（数据库 GROUP BY 直接统计，不加载素材明细）
 */
@Data
public class MaterialCategoryCount {

    /**
     * 子库: portrait_face/portrait_styling/costume_real/costume_anime/pose
     */
    private String libraryType;

    /**
     * 分类编码
     */
    private String categoryCode;

    /**
     * 该分类下启用中的素材数量
     */
    private Long total;
}
