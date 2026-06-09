package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.FeedbackWithUser;
import com.rawchen.entity.Feedback;
import com.rawchen.entity.R;
import com.rawchen.mapper.FeedbackMapper;
import com.rawchen.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final FeedbackMapper feedbackMapper;

    @PostMapping("/feedback")
    public R<Feedback> createFeedback(
            @RequestBody Feedback feedback,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User user) {

        if (user == null) {
            return R.unauthorized();
        }
        if (feedback.getContent() == null || feedback.getContent().trim().isEmpty()) {
            return R.badRequest("反馈内容不能为空");
        }
        feedback.setUserId(Long.parseLong(user.getUsername()));
        Feedback created = feedbackService.createFeedback(feedback);
        return R.ok(created);
    }

    @GetMapping("/admin/feedback")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Map<String, Object>> getFeedbackPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer status) {

        IPage<FeedbackWithUser> feedbacks = feedbackMapper.selectFeedbacksWithUser(
                new Page<>(page, size), status);

        Map<String, Object> result = new HashMap<>();
        result.put("content", feedbacks.getRecords().stream().map(this::toFeedbackResponse).collect(Collectors.toList()));
        result.put("totalPages", feedbacks.getPages());
        result.put("totalElements", feedbacks.getTotal());
        result.put("currentPage", page);

        return R.ok(result);
    }

    @DeleteMapping("/admin/feedback/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Void> deleteFeedback(@PathVariable Long id) {
        feedbackService.removeById(id);
        return R.ok();
    }

    @PutMapping("/admin/feedback/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Void> updateFeedbackStatus(
            @PathVariable Long id,
            @RequestParam Integer status,
            @RequestParam(required = false) String reply) {

        Feedback feedback = new Feedback();
        feedback.setId(id);
        feedback.setStatus(status);
        if (reply != null && !reply.trim().isEmpty()) {
            feedback.setReply(reply);
        }
        feedbackService.updateById(feedback);
        return R.ok();
    }

    private Map<String, Object> toFeedbackResponse(FeedbackWithUser feedback) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", feedback.getId());
        result.put("userId", feedback.getUserId());
        result.put("username", feedback.getUsername() != null ? feedback.getUsername() : "");
        result.put("content", feedback.getContent());
        result.put("contact", feedback.getContact());
        result.put("images", feedback.getImages());
        result.put("status", feedback.getStatus());
        result.put("reply", feedback.getReply());
        result.put("createTime", feedback.getCreateTime() != null ? feedback.getCreateTime().toString() : "");
        return result;
    }
}
