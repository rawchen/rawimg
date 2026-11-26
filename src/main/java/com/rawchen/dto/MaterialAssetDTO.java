package com.rawchen.dto;

import lombok.Data;

/**
 * 素材导入DTO（爬虫批量入库 / 后台新增素材）
 */
@Data
public class MaterialAssetDTO {

    /**
     * 大类: portrait/costume/pose
     */
    private String groupType;

    /**
     * 子库: portrait_face/portrait_styling/costume_real/costume_anime/pose
     */
    private String libraryType;

    /**
     * 分类编码
     */
    private String categoryCode;

    /**
     * 分类名称（中文，为空时后端按分类表回填）
     */
    private String categoryName;

    /**
     * 来源站素材ID
     */
    private String sourceId;

    /**
     * 中文标题
     */
    private String title;

    /**
     * 原始标题（日文/英文）
     */
    private String titleOrigin;

    /**
     * 预览图URL（webp/jpg）
     */
    private String thumbUrl;

    /**
     * 预览图URL（列表展示用）
     */
    private String previewUrl;

    /**
     * 正式图URL（png）
     */
    private String fullUrl;

    private Integer width;

    private Integer height;

    /**
     * 扩展信息JSON
     */
    private String extra;

    private Integer sortOrder;

    /**
     * 状态: 1=启用 0=停用，为空默认启用
     */
    private Integer status;
}
