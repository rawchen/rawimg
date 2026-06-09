package com.rawchen.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 反馈响应DTO（包含用户名）
 */
@Data
public class FeedbackWithUser {
    private Long id;
    private Long userId;
    private String username;
    private String content;
    private String contact;
    private String images;
    private Integer status;
    private String reply;
    private LocalDateTime createTime;
}
