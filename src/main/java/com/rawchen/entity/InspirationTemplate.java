package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 灵感模板实体类
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("inspiration_template")
public class InspirationTemplate extends BaseEntity {

    /**
     * 模板标题
     */
    private String title;

    /**
     * 提示词模板（支持 {{变量}} 格式）
     */
    private String prompt;

    /**
     * 分类
     */
    private String category;

    /**
     * 示例图片URL
     */
    private String imageUrl;

    /**
     * 排序
     */
    private Integer sortOrder;
}
