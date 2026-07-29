package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 消费日志实体类（简化版）
 */
@Data
@TableName(value = "consume_log", autoResultMap = true)
public class ConsumeLog extends BaseEntity {

    /**
     * 用户ID
     */
    @TableField("user_id")
    private Long userId;

    /**
     * 任务ID（异步任务）
     */
    @TableField("task_id")
    private String taskId;

    /**
     * 操作类型：create-创作，beauty-美颜，expand-扩图，matting-抠图等
     */
    @TableField("operation_type")
    private String operationType;

    /**
     * 使用的模型代码
     */
    @TableField("model_code")
    private String modelCode;

    /**
     * 模型名称
     */
    @TableField("model_name")
    private String modelName;

    /**
     * 状态：pending-处理中，success-成功，failed-失败
     */
    private String status;

    /**
     * 图片尺寸，如 1920x1080
     */
    @TableField("image_size")
    private String imageSize;

    /**
     * 本次花费（元）
     */
    @TableField("total_cost")
    private BigDecimal cost;

    /**
     * 任务耗时（毫秒）
     */
    @TableField("duration_ms")
    private Integer durationMs;

    /**
     * 错误信息
     */
    @TableField("error_msg")
    private String errorMsg;

    /**
     * 结果图片URL
     */
    @TableField("result_url")
    private String resultUrl;
}
