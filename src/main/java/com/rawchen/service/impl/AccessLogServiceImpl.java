package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.dto.ChartItemResponse;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.dto.TrendItemResponse;
import com.rawchen.entity.AccessLog;
import com.rawchen.mapper.AccessLogMapper;
import com.rawchen.service.AccessLogService;
import com.rawchen.util.IpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 访问日志服务实现类
 */
@Service
@RequiredArgsConstructor

public class AccessLogServiceImpl extends ServiceImpl<AccessLogMapper, AccessLog> implements AccessLogService {

    @Autowired
    IpUtil ipUtil;

    @Override
    public void logAccess(Long userId, Long galleryId, String ip, String userAgent, String action) {
        AccessLog log = new AccessLog();
        log.setIp(ip);
        log.setUserAgent(userAgent);
        log.setAction(action);
        log.setRegion(ipUtil.getRegion(ip));
        log.setUserId(userId);
        log.setGalleryId(galleryId);
        save(log);
    }

    @Override
    public void logCardKeyAccess(Long userId, String ip, String userAgent, String action) {
        AccessLog log = new AccessLog();
        log.setIp(ip);
        log.setUserAgent(userAgent);
        log.setAction(action);
        log.setRegion(ipUtil.getRegion(ip));
        log.setUserId(userId);
        save(log);
    }

    @Override
    public List<AccessLog> getRecentAccess(int limit) {
        LambdaQueryWrapper<AccessLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(AccessLog::getCreateTime, LocalDateTime.now().minusDays(1))
               .orderByDesc(AccessLog::getCreateTime);
        return list(wrapper);
    }

    @Override
    public long countUniqueVisitorsSince(LocalDateTime startTime) {
        return baseMapper.countUniqueVisitorsSince(startTime);
    }

    @Override
    public long countAccessSince(LocalDateTime startTime) {
        LambdaQueryWrapper<AccessLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(AccessLog::getCreateTime, startTime);
        return count(wrapper);
    }

    @Override
    public List<TopGalleriesByAccess> getTopGalleriesByAccess(int limit) {
        return baseMapper.findTopGalleriesByAccess(LocalDateTime.now().minusDays(30), limit);
    }

    @Override
    public List<Map<String, Object>> getTrendChart() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(29).withHour(0).withMinute(0).withSecond(0);
        return baseMapper.findTrendChart(startDate);
    }

    @Override
    public List<ChartItemResponse> getTopGalleriesByAccessWithTitles(int limit) {
        return baseMapper.findTopGalleriesByAccessWithTitles(LocalDateTime.now().minusDays(30), limit);
    }
}
