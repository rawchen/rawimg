package com.rawchen.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 访问日志响应DTO（包含用户名）
 */
@Data
public class AccessLogWithUser {
    private Long id;
    private Long userId;
    private String username;
    private Long galleryId;
    private String ip;
    private String region;
    private String userAgent;
    private String action;
    private LocalDateTime createTime;
}
