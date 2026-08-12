package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.dto.BalanceStatsResponse;
import com.rawchen.entity.ConsumeLog;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.ConsumeLogService;
import com.rawchen.service.UserBalanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 用户余额控制器
 */
@RestController
@RequestMapping("/api/balance")
@RequiredArgsConstructor
public class UserBalanceController {

    private final UserBalanceService userBalanceService;
    private final ConsumeLogService consumeLogService;

    /**
     * 获取当前用户余额统计
     */
    @GetMapping("/stats")
    public R<BalanceStatsResponse> getStats(@AuthenticationPrincipal SysUser user) {
        BalanceStatsResponse stats = userBalanceService.getStats(user.getId());
        return R.ok(stats);
    }

    /**
     * 获取消费日志
     */
    @GetMapping("/consume-logs")
    public R<IPage<ConsumeLog>> getConsumeLogs(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @AuthenticationPrincipal SysUser user) {

        IPage<ConsumeLog> logs = consumeLogService.getUserLogPage(user.getId(), page, size);
        return R.ok(logs);
    }

    /**
     * 获取消费统计图表数据
     *
     * @param hours 统计时长（小时数或天数，根据 type 决定）
     * @param type  统计类型：hour（按小时，默认）或 day（按天）
     */
    @GetMapping("/consume-chart")
    public R<ConsumeChartResponse> getConsumeChart(
            @RequestParam(defaultValue = "7") Integer hours,
            @RequestParam(defaultValue = "hour") String type,
            @AuthenticationPrincipal SysUser user) {

        ConsumeChartResponse response = new ConsumeChartResponse();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime startTime;
        if ("day".equalsIgnoreCase(type)) {
            response.setHourlyStats(consumeLogService.getDailyStats(user.getId(), hours));
            startTime = now.minusDays(hours);
        } else {
            response.setHourlyStats(consumeLogService.getHourlyStats(user.getId(), hours));
            startTime = now.minusHours(hours);
        }
        response.setModelStats(consumeLogService.getModelStats(user.getId(), startTime, now));
        return R.ok(response);
    }

    /**
     * 消费图表响应
     */
    @lombok.Data
    public static class ConsumeChartResponse {
        private java.util.List<com.rawchen.dto.ConsumeLogStatsResponse.HourlyStats> hourlyStats;
        private java.util.List<com.rawchen.dto.ConsumeLogStatsResponse.ModelStats> modelStats;
    }
}
