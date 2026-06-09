package com.rawchen.dto;

import lombok.Data;

/**
 * 图集图片DTO，用于编辑页面
 */
@Data
public class GalleryImageDto {
    /**
     * 图片ID（已有图片才有ID）
     */
    private Long id;

    /**
     * 图片URL
     */
    private String url;

    /**
     * 排序顺序
     */
    private Integer sortOrder;

    /**
     * 描述
     */
    private String description;

    /**
     * 是否预览图
     */
    private Boolean isPreview;

    /**
     * 操作类型：create（新增）, update（修改）, delete（删除）
     */
    private String operation;

    public static GalleryImageDto fromExisting(com.rawchen.entity.GalleryImage image) {
        GalleryImageDto dto = new GalleryImageDto();
        dto.setId(image.getId());
        dto.setUrl(image.getUrl());
        dto.setSortOrder(image.getSortOrder());
        dto.setDescription(image.getDescription());
        dto.setIsPreview(image.getIsPreview());
        dto.setOperation("update");
        return dto;
    }

    public static GalleryImageDto forNew(String url, Integer sortOrder) {
        GalleryImageDto dto = new GalleryImageDto();
        dto.setUrl(url);
        dto.setSortOrder(sortOrder);
        dto.setIsPreview(true);
        dto.setOperation("create");
        return dto;
    }

    public static GalleryImageDto forDelete(Long id) {
        GalleryImageDto dto = new GalleryImageDto();
        dto.setId(id);
        dto.setOperation("delete");
        return dto;
    }
}
