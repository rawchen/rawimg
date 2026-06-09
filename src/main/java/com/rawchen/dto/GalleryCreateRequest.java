package com.rawchen.dto;

import lombok.Data;

import java.util.List;

@Data
public class GalleryCreateRequest {
    private String title;

    private String description;

    private String coverUrl;

    private String content;

    private String downloadLink;

    /**
     * 图片列表（创建时只用url，更新时包含id和operation）
     */
    private List<GalleryImageDto> images;

    private String status;
}
