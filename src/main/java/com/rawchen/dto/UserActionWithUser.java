package com.rawchen.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户行为日志响应DTO（包含用户名）
 */
@Data
public class UserActionWithUser {
    private Long id;
    private Long userId;
    private String username;
    private Long galleryId;
    private String actionType;
    private LocalDateTime createTime;
}
