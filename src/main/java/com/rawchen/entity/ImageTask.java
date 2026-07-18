package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 图像异步任务实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("image_task")
public class ImageTask extends BaseEntity {

    /**
     * 任务ID（UUID格式）
     */
    private String taskId;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 任务类型：create-图片创作, enhance-图片增强
     */
    private String taskType;

    /**
     * 任务状态：pending-处理中, done-完成, error-失败
     */
    private String status;

    /**
     * 提示词
     */
    private String prompt;

    /**
     * 图片尺寸
     */
    private String size;

    /**
     * 原始参考图URL（JSON数组，多图时存储多个URL）
     */
    private String referenceImageUrls;

    /**
     * 原始图片URL（用于扩展/增强等任务的原图）
     */
    private String originalImageUrl;

    /**
     * 遮罩图片URL（用于扩展任务的mask图）
     */
    private String maskImageUrl;

    /**
     * 使用的模型名称（如：gpt-image-2, gemini-2.5-flash-image）
     */
    private String model;

    /**
     * 生成的图片URL（OSS地址）- 存储值
     */
    private String resultImageUrl;

    /**
     * 错误信息
     */
    private String errorMsg;

    /**
     * 处理耗时（毫秒）
     */
    private Long duration;

    /**
     * 获取结果图片URL，自动补全https前缀
     */
    public String getResultImageUrl() {
        return ensureHttpsUrl(this.resultImageUrl);
    }

    /**
     * 获取参考图URL，自动补全https前缀
     */
    public String getReferenceImageUrls() {
        return ensureHttpsUrlJson(this.referenceImageUrls);
    }

    /**
     * 确保URL有https前缀
     */
    private String ensureHttpsUrl(String url) {
        if (url == null || url.isEmpty()) {
            return url;
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return "https://" + url;
    }

    /**
     * 确保JSON数组中的URL都有https前缀
     */
    private String ensureHttpsUrlJson(String jsonUrls) {
        if (jsonUrls == null || jsonUrls.isEmpty()) {
            return jsonUrls;
        }
        // 如果已经是完整URL，直接返回
        if (jsonUrls.contains("https://") || jsonUrls.contains("http://")) {
            return jsonUrls;
        }
        // 处理JSON数组中的每个URL
        try {
            if (jsonUrls.startsWith("[") && jsonUrls.endsWith("]")) {
                StringBuilder result = new StringBuilder("[");
                String[] urls = jsonUrls.substring(1, jsonUrls.length() - 1).split(",");
                for (int i = 0; i < urls.length; i++) {
                    String url = urls[i].trim().replace("\"", "");
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "\"https://" + url + "\"";
                    } else {
                        url = "\"" + url + "\"";
                    }
                    if (i > 0) {
                        result.append(",");
                    }
                    result.append(url);
                }
                result.append("]");
                return result.toString();
            }
        } catch (Exception e) {
            // 解析失败，返回原值
        }
        return jsonUrls;
    }
}
