package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "user_action", autoResultMap = true)
public class UserAction extends BaseEntity {

    private Long userId;

    private Long galleryId;

    @TableField("action_type")
    private ActionType actionType;

    public enum ActionType {
        LIKE, FAVORITE, DOWNLOAD, CARD_VALIDATE, CARD_REDEEM
    }
}
