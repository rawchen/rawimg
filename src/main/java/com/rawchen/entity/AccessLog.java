package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "access_log", autoResultMap = true)
public class AccessLog extends BaseEntity {

    @TableField("user_id")
    private Long userId;

    @TableField("gallery_id")
    private Long galleryId;

    @TableField("ip_address")
    private String ip;

    @TableField("ip_location")
    private String region;

    private String userAgent;

    private String referer;

    @TableField("access_type")
    private String action;

}
