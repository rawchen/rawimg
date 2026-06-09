package com.rawchen.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AuthResponse {
    private String token;
    private Long userId;
    private String username;
    private String email;
    private String role;
    private boolean vip;
    private LocalDateTime vipExpireTime;
    private String vipLevel;
    private Integer dailyDownloadCount;
    private Integer dailyDownloadLimit;
    private Integer points;
    private String avatar;

    public AuthResponse(String token, Long userId, String username, String email,
                       String role, boolean vip, Integer points, String avatar) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.role = role;
        this.vip = vip;
        this.points = points;
        this.avatar = avatar;
    }

    public AuthResponse(String token, Long userId, String username, String email,
                       String role, boolean vip, LocalDateTime vipExpireTime, String vipLevel,
                       Integer dailyDownloadCount, Integer dailyDownloadLimit, Integer points, String avatar) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.role = role;
        this.vip = vip;
        this.vipExpireTime = vipExpireTime;
        this.vipLevel = vipLevel;
        this.dailyDownloadCount = dailyDownloadCount;
        this.dailyDownloadLimit = dailyDownloadLimit;
        this.points = points;
        this.avatar = avatar;
    }
}
