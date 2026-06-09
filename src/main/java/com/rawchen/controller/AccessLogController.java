package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.AccessLogWithUser;
import com.rawchen.entity.AccessLog;
import com.rawchen.entity.R;
import com.rawchen.mapper.AccessLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 访问日志管理Controller
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AccessLogController {

    private final AccessLogMapper accessLogMapper;

    @GetMapping("/logs")
    public R<Map<String, Object>> getAccessLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long galleryId) {

        IPage<AccessLogWithUser> logs = accessLogMapper.selectAccessLogsWithUser(
                new Page<>(page, size), action, userId, galleryId);

        Map<String, Object> result = new HashMap<>();
        result.put("content", logs.getRecords().stream().map(this::toLogResponse).collect(Collectors.toList()));
        result.put("totalPages", logs.getPages());
        result.put("totalElements", logs.getTotal());
        result.put("currentPage", page);

        return R.ok(result);
    }

    @DeleteMapping("/logs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> deleteLog(@PathVariable Long id) {
        accessLogMapper.deleteById(id);
        return R.ok();
    }

    @DeleteMapping("/logs/clear")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> clearLogs(
            @RequestParam(required = false) Integer days) {

        LambdaQueryWrapper<AccessLog> wrapper = new LambdaQueryWrapper<>();
        if (days != null && days > 0) {
            wrapper.lt(AccessLog::getCreateTime, LocalDateTime.now().minusDays(days));
        }

        accessLogMapper.delete(wrapper);
        return R.ok();
    }

    private Map<String, Object> toLogResponse(AccessLogWithUser log) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", log.getId());
        result.put("userId", log.getUserId() != null ? log.getUserId() : 0);
        result.put("username", log.getUsername() != null ? log.getUsername() : "");
        result.put("galleryId", log.getGalleryId() != null ? log.getGalleryId() : 0);
        result.put("ip", log.getIp() != null ? log.getIp() : "");
        result.put("region", log.getRegion() != null ? log.getRegion() : "");
        result.put("userAgent", log.getUserAgent() != null ? log.getUserAgent() : "");
        result.put("action", log.getAction() != null ? log.getAction() : "");
        result.put("createTime", log.getCreateTime() != null ? log.getCreateTime().toString() : "");
        return result;
    }
}
