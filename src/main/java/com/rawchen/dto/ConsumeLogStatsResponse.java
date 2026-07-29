package com.rawchen.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 消费日志统计响应
 */
@Data
public class ConsumeLogStatsResponse {

    /**
     * 总消费金额
     */
    private BigDecimal totalCost;

    /**
     * 总操作次数
     */
    private Integer totalOperations;

    /**
     * 按小时统计
     */
    private List<HourlyStats> hourlyStats;

    /**
     * 按模型统计
     */
    private List<ModelStats> modelStats;

    /**
     * 按操作类型统计
     */
    private List<OperationStats> operationStats;

    /**
     * 小时统计
     */
    @Data
    public static class HourlyStats {
        /**
         * 小时（如 2026-07-29 10:00）
         */
        private String hour;

        /**
         * 该小时消费金额
         */
        private BigDecimal cost;

        /**
         * 该小时操作次数
         */
        private Integer count;

        /**
         * 按模型分布
         */
        private List<ModelDistribution> modelDistribution;
    }

    /**
     * 模型统计
     */
    @Data
    public static class ModelStats {
        /**
         * 模型名称
         */
        private String modelName;

        /**
         * 模型代码
         */
        private String modelCode;

        /**
         * 消费金额
         */
        private BigDecimal cost;

        /**
         * 操作次数
         */
        private Integer count;

        /**
         * 占比
         */
        private BigDecimal percentage;
    }

    /**
     * 操作类型统计
     */
    @Data
    public static class OperationStats {
        /**
         * 操作类型
         */
        private String operationType;

        /**
         * 操作类型名称
         */
        private String operationName;

        /**
         * 消费金额
         */
        private BigDecimal cost;

        /**
         * 操作次数
         */
        private Integer count;

        /**
         * 占比
         */
        private BigDecimal percentage;
    }

    /**
     * 模型分布
     */
    @Data
    public static class ModelDistribution {
        /**
         * 模型名称
         */
        private String modelName;

        /**
         * 消费金额
         */
        private BigDecimal cost;

        /**
         * 操作次数
         */
        private Integer count;
    }
}
