package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.ConsumeLogStatsResponse;
import com.rawchen.entity.ConsumeLog;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 消费日志服务接口（简化版）
 */
public interface ConsumeLogService extends IService<ConsumeLog> {

    /**
     * 创建消费日志
     *
     * @param userId        用户ID
     * @param taskId        任务ID
     * @param operationType 操作类型
     * @param modelCode     模型代码
     * @param modelName     模型名称
     * @param imageSize     图片尺寸
     * @param cost          花费
     * @return 消费日志
     */
    ConsumeLog createLog(Long userId, String taskId, String operationType, String modelCode, String modelName,
                         String imageSize, BigDecimal cost);

    /**
     * 更新日志状态为成功
     *
     * @param taskId   任务ID
     * @param resultUrl 结果URL
     * @param durationMs 耗时（毫秒）
     */
    void updateSuccess(String taskId, String resultUrl, Integer durationMs);

    /**
     * 更新日志状态为失败
     *
     * @param taskId   任务ID
     * @param errorMsg 错误信息
     */
    void updateFailed(String taskId, String errorMsg);

    /**
     * 获取用户消费日志分页
     *
     * @param userId 用户ID
     * @param page   页码
     * @param size   每页大小
     * @return 分页数据
     */
    IPage<ConsumeLog> getUserLogPage(Long userId, Integer page, Integer size);

    /**
     * 获取用户消费统计
     *
     * @param userId 用户ID
     * @param startTime 开始时间
     * @param endTime   结束时间
     * @return 统计数据
     */
    ConsumeLogStatsResponse getStats(Long userId, LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 获取按小时统计的消费数据（用于图表）
     *
     * @param userId 用户ID
     * @param hours  小时数（如8表示近8小时）
     * @return 统计数据
     */
    List<ConsumeLogStatsResponse.HourlyStats> getHourlyStats(Long userId, Integer hours);

    /**
     * 获取按模型统计的消费数据
     *
     * @param userId 用户ID
     * @param startTime 开始时间
     * @param endTime   结束时间
     * @return 统计数据
     */
    List<ConsumeLogStatsResponse.ModelStats> getModelStats(Long userId, LocalDateTime startTime, LocalDateTime endTime);
}
