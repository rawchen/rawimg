package com.rawchen.dto;

import lombok.Data;

@Data
public class UserStats {
    private Long userId;
    private Long downloadCount;
    private Long likeCount;
    private Long favoriteCount;
    private String vipType;
    private String vipLevel;
    private Boolean vip;
    private Integer vipRemainingDays;
    private Integer dailyDownloadCount;
    private Integer dailyDownloadLimit;
}
