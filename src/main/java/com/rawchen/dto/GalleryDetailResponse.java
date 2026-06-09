package com.rawchen.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class GalleryDetailResponse {
    private Long id;
    private String title;
    private String description;
    private String coverUrl;
    private String content;
    private Integer viewCount;
    private Integer likeCount;
    private Integer favoriteCount;
    private Integer commentCount;
    private Integer downloadCount;
    private LocalDateTime createTime;
    private boolean vip;
    private boolean locked;
    private Integer previewLimit;
    private Integer totalImageCount;
    private List<GalleryImageResponse> images;
    private boolean liked;
    private boolean favorited;

    @Data
    public static class GalleryImageResponse {
        private Long id;
        private String url;
        private String description;
        private Integer sortOrder;
    }
}
