package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

@Data
@TableName(value = "sys_config", autoResultMap = true)
public class SysConfig extends BaseEntity {

    @TableField("config_key")
    private String configKey;

    @TableField("config_value")
    private String configValue;

    private String configType;

    private String description;
}
