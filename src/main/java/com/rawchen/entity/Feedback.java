package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "feedback", autoResultMap = true)
public class Feedback extends BaseEntity {

    @TableField("user_id")
    private Long userId;

    private String content;

    private String contact;

    private String images;

    private Integer status = 0;

    private String reply;

    @TableField(exist = false)
    private String username;

}
