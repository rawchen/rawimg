package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "gallery", autoResultMap = true)
public class Gallery extends BaseEntity {

    private String title;

    private String description;

    private String coverUrl;

    private String content;

    @TableField("status")
    private GalleryStatus status = GalleryStatus.DRAFT;

    private Integer viewCount = 0;

    private Integer likeCount = 0;

    private Integer favoriteCount = 0;

    private Integer commentCount = 0;

    private Integer downloadCount = 0;

    private String downloadLink;

    public enum GalleryStatus {
        DRAFT, PUBLISHED
    }
}
