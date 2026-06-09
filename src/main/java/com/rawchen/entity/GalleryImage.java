package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "gallery_image", autoResultMap = true)
public class GalleryImage extends BaseEntity  {

    private Long galleryId;

    private String url;

    private String thumbnailUrl;

    private String description;

    private Integer sortOrder;

    private Boolean isPreview = true;

}
