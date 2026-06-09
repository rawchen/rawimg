package com.rawchen.dto;

import com.rawchen.entity.Gallery;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GalleryResponse {
    private Long id;
    private String title;
    private String description;
    private String coverUrl;
    private String status;
    private Integer viewCount;
    private Integer likeCount;
    private Integer favoriteCount;
    private Integer commentCount;
    private Integer downloadCount;
    private LocalDateTime createTime;
}
