package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.ChartItemResponse;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.dto.TrendItemResponse;
import com.rawchen.entity.AccessLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 访问日志服务接口
 */
public interface AccessLogService extends IService<AccessLog> {

    /**
     * 记录访问日志
     */
    void logAccess(Long userId, Long galleryId, String ip, String userAgent, String action);

    /**
     * 记录卡密操作日志
     */
    void logCardKeyAccess(Long userId, String ip, String userAgent, String action);

    /**
     * 获取最近访问记录
     */
    List<AccessLog> getRecentAccess(int limit);

    /**
     * 统计指定时间以来的独立访客数
     */
    long countUniqueVisitorsSince(LocalDateTime startTime);

    /**
     * 统计指定时间以来的访问量
     */
    long countAccessSince(LocalDateTime startTime);

    /**
     * 获取访问量最高的图库
     */
    List<TopGalleriesByAccess> getTopGalleriesByAccess(int limit);

    /**
     * 获取最近30天的访问趋势
     */
    List<Map<String, Object>> getTrendChart();

    /**
     * 获取访问量最高的图库（包含标题）
     */
    List<ChartItemResponse> getTopGalleriesByAccessWithTitles(int limit);
}
