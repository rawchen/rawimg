package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 素材库分类
 * <p>
 * 用于人物素材库（人脸/造型）、服装素材库（写实/动漫）、姿态库的分类管理。
 *
 * @author RawChen
 * @date 2026-11-26
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("material_category")
public class MaterialCategory extends BaseEntity {

    /**
     * 大类: portrait=人物库 costume=服装库 pose=姿态库
     */
    private String groupType;

    /**
     * 子库: portrait_face/portrait_styling/costume_real/costume_anime/pose
     */
    private String libraryType;

    /**
     * 分类编码（英文，如 short / spring / full_sexy）
     */
    private String categoryCode;

    /**
     * 分类名称（中文）
     */
    private String categoryName;

    /**
     * 分类原名（日文/英文）
     */
    private String categoryNameOrigin;

    /**
     * 排序值，越小越靠前
     */
    private Integer sortOrder;

    /**
     * 状态: 1=启用 0=停用
     */
    private Integer status;
}
