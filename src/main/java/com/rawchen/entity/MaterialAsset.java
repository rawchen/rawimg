package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 素材库素材
 * <p>
 * 图片统一存放在正式环境 OSS：
 * thumb_url / preview_url 为预览图（webp 或 jpg），full_url 为正式图（png）。
 *
 * @author RawChen
 * @date 2026-11-26
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("material_asset")
public class MaterialAsset extends BaseEntity {

    /**
     * 大类: portrait/costume/pose
     */
    private String groupType;

    /**
     * 子库: portrait_face/portrait_styling/costume_real/costume_anime/pose
     */
    private String libraryType;

    /**
     * 分类编码
     */
    private String categoryCode;

    /**
     * 分类名称（中文）
     */
    private String categoryName;

    /**
     * 来源站素材ID
     */
    private String sourceId;

    /**
     * 中文标题
     */
    private String title;

    /**
     * 原始标题（日文/英文）
     */
    private String titleOrigin;

    /**
     * 预览图URL（webp/jpg）
     */
    private String thumbUrl;

    /**
     * 预览图URL（列表展示用）
     */
    private String previewUrl;

    /**
     * 正式图URL（png）
     */
    private String fullUrl;

    /**
     * 原图宽度
     */
    private Integer width;

    /**
     * 原图高度
     */
    private Integer height;

    /**
     * 扩展信息JSON（发长/角度/姿势编号/服装关键词等）
     */
    private String extra;

    /**
     * 排序值
     */
    private Integer sortOrder;

    /**
     * 状态: 1=启用 0=停用
     */
    private Integer status;
}
