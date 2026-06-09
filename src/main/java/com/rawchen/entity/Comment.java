package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "comment", autoResultMap = true)
public class Comment extends BaseEntity {

    @TableField("gallery_id")
    private Long galleryId;

    @TableField("user_id")
    private Long userId;

    private String content;

    @TableField("parent_id")
    private Long parentId;

    private Integer likeCount;

    private Integer status = 1;

    /**
     * 用户昵称（非数据库字段，关联查询填充）
     */
    @TableField(exist = false)
    private String username;

}
