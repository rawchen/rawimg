package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.dto.ConsumeLogStatsResponse;
import com.rawchen.entity.ConsumeLog;
import com.rawchen.mapper.ConsumeLogMapper;
import com.rawchen.service.ConsumeLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 消费日志服务实现（简化版）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConsumeLogServiceImpl extends ServiceImpl<ConsumeLogMapper, ConsumeLog> implements ConsumeLogService {

    @Override
    public ConsumeLog createLog(Long userId, String taskId, String operationType, String modelCode, String modelName,
                                 String imageSize, BigDecimal cost) {
        ConsumeLog log = new ConsumeLog();
        log.setUserId(userId);
        log.setTaskId(taskId);
        log.setOperationType(operationType);
        log.setModelCode(modelCode);
        log.setModelName(modelName);
        log.setImageSize(imageSize);
        log.setCost(cost);
        log.setStatus("pending");
        save(log);
        return log;
    }

    @Override
    public void updateSuccess(String taskId, String resultUrl, Integer durationMs) {
        LambdaUpdateWrapper<ConsumeLog> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(ConsumeLog::getTaskId, taskId)
               .set(ConsumeLog::getStatus, "success")
               .set(ConsumeLog::getResultUrl, resultUrl)
               .set(ConsumeLog::getDurationMs, durationMs);
        update(wrapper);
    }

    @Override
    public void updateFailed(String taskId, String errorMsg) {
        LambdaUpdateWrapper<ConsumeLog> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(ConsumeLog::getTaskId, taskId)
               .set(ConsumeLog::getStatus, "failed")
               .set(ConsumeLog::getErrorMsg, errorMsg);
        update(wrapper);
    }

    @Override
    public com.baomidou.mybatisplus.core.metadata.IPage<ConsumeLog> getUserLogPage(Long userId, Integer page, Integer size) {
        LambdaQueryWrapper<ConsumeLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConsumeLog::getUserId, userId)
               .orderByDesc(ConsumeLog::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public ConsumeLogStatsResponse getStats(Long userId, LocalDateTime startTime, LocalDateTime endTime) {
        LambdaQueryWrapper<ConsumeLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConsumeLog::getUserId, userId)
               // 统计所有消费记录（包括pending、success、failed），因为扣费已经发生
               .between(ConsumeLog::getCreateTime, startTime, endTime);

        List<ConsumeLog> logs = list(wrapper);

        ConsumeLogStatsResponse response = new ConsumeLogStatsResponse();
        BigDecimal totalCost = BigDecimal.ZERO;
        int totalOperations = 0;

        for (ConsumeLog log : logs) {
            if (log.getCost() != null) {
                totalCost = totalCost.add(log.getCost());
            }
            totalOperations++;
        }

        response.setTotalCost(totalCost.setScale(4, RoundingMode.HALF_UP));
        response.setTotalOperations(totalOperations);

        return response;
    }

    @Override
    public List<ConsumeLogStatsResponse.HourlyStats> getHourlyStats(Long userId, Integer hours) {
        List<ConsumeLogStatsResponse.HourlyStats> result = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:00");

        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);

        // 查询该时间段内的所有日志
        LambdaQueryWrapper<ConsumeLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConsumeLog::getUserId, userId)
               .eq(ConsumeLog::getStatus, "success")
               .between(ConsumeLog::getCreateTime, startTime, endTime);
        List<ConsumeLog> logs = list(wrapper);

        // 按小时分组
        Map<String, List<ConsumeLog>> hourlyMap = new HashMap<>();
        for (ConsumeLog log : logs) {
            String hour = log.getCreateTime().format(formatter);
            hourlyMap.computeIfAbsent(hour, k -> new ArrayList<>()).add(log);
        }

        // 填充每个小时的数据
        for (int i = hours - 1; i >= 0; i--) {
            LocalDateTime hour = endTime.minusHours(i).withMinute(0).withSecond(0).withNano(0);
            String hourStr = hour.format(formatter);
            List<ConsumeLog> hourLogs = hourlyMap.getOrDefault(hourStr, new ArrayList<>());

            ConsumeLogStatsResponse.HourlyStats stats = new ConsumeLogStatsResponse.HourlyStats();
            stats.setHour(hourStr);

            BigDecimal cost = BigDecimal.ZERO;
            int count = 0;

            // 按模型统计
            Map<String, BigDecimal> modelCosts = new HashMap<>();
            Map<String, Integer> modelCounts = new HashMap<>();

            for (ConsumeLog log : hourLogs) {
                if (log.getCost() != null) {
                    cost = cost.add(log.getCost());
                }
                count++;

                String modelKey = log.getModelName() != null ? log.getModelName() : log.getModelCode();
                modelCosts.merge(modelKey, log.getCost() != null ? log.getCost() : BigDecimal.ZERO, BigDecimal::add);
                modelCounts.merge(modelKey, 1, Integer::sum);
            }

            stats.setCost(cost.setScale(4, RoundingMode.HALF_UP));
            stats.setCount(count);

            // 构建模型分布
            List<ConsumeLogStatsResponse.ModelDistribution> distributions = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> entry : modelCosts.entrySet()) {
                ConsumeLogStatsResponse.ModelDistribution dist = new ConsumeLogStatsResponse.ModelDistribution();
                dist.setModelName(entry.getKey());
                dist.setCost(entry.getValue().setScale(4, RoundingMode.HALF_UP));
                dist.setCount(modelCounts.get(entry.getKey()));
                distributions.add(dist);
            }
            stats.setModelDistribution(distributions);

            result.add(stats);
        }

        return result;
    }

    @Override
    public List<ConsumeLogStatsResponse.HourlyStats> getDailyStats(Long userId, Integer days) {
        List<ConsumeLogStatsResponse.HourlyStats> result = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusDays(days);

        // 查询该时间段内的所有日志
        LambdaQueryWrapper<ConsumeLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConsumeLog::getUserId, userId)
               .eq(ConsumeLog::getStatus, "success")
               .between(ConsumeLog::getCreateTime, startTime, endTime);
        List<ConsumeLog> logs = list(wrapper);

        // 按天分组
        Map<String, List<ConsumeLog>> dailyMap = new HashMap<>();
        for (ConsumeLog log : logs) {
            String day = log.getCreateTime().format(formatter);
            dailyMap.computeIfAbsent(day, k -> new ArrayList<>()).add(log);
        }

        // 填充每天的数据
        for (int i = days - 1; i >= 0; i--) {
            LocalDateTime day = endTime.minusDays(i).toLocalDate().atStartOfDay();
            String dayStr = day.format(formatter);
            List<ConsumeLog> dayLogs = dailyMap.getOrDefault(dayStr, new ArrayList<>());

            ConsumeLogStatsResponse.HourlyStats stats = new ConsumeLogStatsResponse.HourlyStats();
            stats.setHour(dayStr);

            BigDecimal cost = BigDecimal.ZERO;
            int count = 0;

            // 按模型统计
            Map<String, BigDecimal> modelCosts = new HashMap<>();
            Map<String, Integer> modelCounts = new HashMap<>();

            for (ConsumeLog log : dayLogs) {
                if (log.getCost() != null) {
                    cost = cost.add(log.getCost());
                }
                count++;

                String modelKey = log.getModelName() != null ? log.getModelName() : log.getModelCode();
                modelCosts.merge(modelKey, log.getCost() != null ? log.getCost() : BigDecimal.ZERO, BigDecimal::add);
                modelCounts.merge(modelKey, 1, Integer::sum);
            }

            stats.setCost(cost.setScale(4, RoundingMode.HALF_UP));
            stats.setCount(count);

            // 构建模型分布
            List<ConsumeLogStatsResponse.ModelDistribution> distributions = new ArrayList<>();
            for (Map.Entry<String, BigDecimal> entry : modelCosts.entrySet()) {
                ConsumeLogStatsResponse.ModelDistribution dist = new ConsumeLogStatsResponse.ModelDistribution();
                dist.setModelName(entry.getKey());
                dist.setCost(entry.getValue().setScale(4, RoundingMode.HALF_UP));
                dist.setCount(modelCounts.get(entry.getKey()));
                distributions.add(dist);
            }
            stats.setModelDistribution(distributions);

            result.add(stats);
        }

        return result;
    }

    @Override
    public List<ConsumeLogStatsResponse.ModelStats> getModelStats(Long userId, LocalDateTime startTime, LocalDateTime endTime) {
        LambdaQueryWrapper<ConsumeLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConsumeLog::getUserId, userId)
               .eq(ConsumeLog::getStatus, "success")
               .between(ConsumeLog::getCreateTime, startTime, endTime);
        List<ConsumeLog> logs = list(wrapper);

        // 按模型分组
        Map<String, BigDecimal> modelCosts = new HashMap<>();
        Map<String, Integer> modelCounts = new HashMap<>();
        Map<String, String> modelNames = new HashMap<>();
        BigDecimal totalCost = BigDecimal.ZERO;

        for (ConsumeLog log : logs) {
            String modelKey = log.getModelCode();
            if (log.getCost() != null) {
                modelCosts.merge(modelKey, log.getCost(), BigDecimal::add);
                totalCost = totalCost.add(log.getCost());
            }
            modelCounts.merge(modelKey, 1, Integer::sum);
            modelNames.put(modelKey, log.getModelName() != null ? log.getModelName() : log.getModelCode());
        }

        List<ConsumeLogStatsResponse.ModelStats> result = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : modelCosts.entrySet()) {
            ConsumeLogStatsResponse.ModelStats stats = new ConsumeLogStatsResponse.ModelStats();
            stats.setModelCode(entry.getKey());
            stats.setModelName(modelNames.get(entry.getKey()));
            stats.setCost(entry.getValue().setScale(4, RoundingMode.HALF_UP));
            stats.setCount(modelCounts.get(entry.getKey()));

            // 计算占比
            if (totalCost.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal percentage = entry.getValue().divide(totalCost, 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal(100));
                stats.setPercentage(percentage);
            } else {
                stats.setPercentage(BigDecimal.ZERO);
            }

            result.add(stats);
        }

        return result;
    }
}
