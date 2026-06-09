package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.UserActionWithUser;
import com.rawchen.entity.R;
import com.rawchen.entity.UserAction;
import com.rawchen.mapper.UserActionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 用户行为日志管理Controller
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class UserActionController {

    private final UserActionMapper userActionMapper;

    @GetMapping("/user-actions")
    public R<Map<String, Object>> getUserActions(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long galleryId) {

        IPage<UserActionWithUser> actions = userActionMapper.selectUserActionsWithUser(
                new Page<>(page, size), actionType, userId, galleryId);

        Map<String, Object> result = new HashMap<>();
        result.put("content", actions.getRecords().stream().map(this::toActionResponse).collect(Collectors.toList()));
        result.put("totalPages", actions.getPages());
        result.put("totalElements", actions.getTotal());
        result.put("currentPage", page);

        return R.ok(result);
    }

    @DeleteMapping("/user-actions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> deleteUserAction(@PathVariable Long id) {
        userActionMapper.deleteById(id);
        return R.ok();
    }

    @DeleteMapping("/user-actions/clear")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> clearUserActions(
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) Integer days) {

        LambdaQueryWrapper<UserAction> wrapper = new LambdaQueryWrapper<>();

        if (actionType != null && !actionType.isEmpty()) {
            wrapper.eq(UserAction::getActionType, UserAction.ActionType.valueOf(actionType));
        }

        if (days != null && days > 0) {
            wrapper.lt(UserAction::getCreateTime, java.time.LocalDateTime.now().minusDays(days));
        }

        userActionMapper.delete(wrapper);
        return R.ok();
    }

    private Map<String, Object> toActionResponse(UserActionWithUser action) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", action.getId());
        result.put("userId", action.getUserId() != null ? action.getUserId() : 0);
        result.put("username", action.getUsername() != null ? action.getUsername() : "");
        result.put("galleryId", action.getGalleryId() != null ? action.getGalleryId() : 0);
        result.put("actionType", action.getActionType() != null ? action.getActionType() : "");
        result.put("createTime", action.getCreateTime() != null ? action.getCreateTime().toString() : "");
        return result;
    }
}
