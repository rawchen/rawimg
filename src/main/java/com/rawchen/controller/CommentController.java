package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.entity.Comment;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.CommentService;
import com.rawchen.util.CaptchaUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/public/galleries/{galleryId}/comments")
    public R<Map<String, Object>> getComments(
            @PathVariable Long galleryId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        IPage<Comment> comments = commentService.getCommentsByGallery(galleryId, page, size);

        List<Map<String, Object>> content = comments.getRecords().stream()
                .map(this::toCommentResponse)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("totalPages", comments.getPages());
        result.put("totalElements", comments.getTotal());

        return R.ok(result);
    }

    @PostMapping("/galleries/{galleryId}/comments")
    public R<Map<String, Object>> createComment(
            @PathVariable Long galleryId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal SysUser user) {

        if (user == null) {
            return R.unauthorized();
        }

        // Validate captcha
        String captchaSessionId = (String) request.get("captchaSessionId");
        Object captchaAnswerObj = request.get("captchaAnswer");
        if (captchaSessionId == null || captchaAnswerObj == null) {
            return R.fail("请完成验证码验证");
        }
        try {
            int captchaAnswer = Integer.parseInt(captchaAnswerObj.toString());
            if (!CaptchaUtil.validateCaptcha(captchaSessionId, captchaAnswer)) {
                return R.fail("验证码错误");
            }
        } catch (NumberFormatException e) {
            return R.fail("验证码格式错误");
        }

        String content = (String) request.get("content");
        Long parentId = request.get("parentId") != null ?
                Long.parseLong(request.get("parentId").toString()) : null;

        Comment comment = commentService.createComment(user.getId(), galleryId, content, parentId);

        Map<String, Object> result = toCommentResponse(comment);
        return R.ok(result);
    }

    @DeleteMapping("/comments/{id}")
    public R<Void> deleteComment(
            @PathVariable Long id,
            @AuthenticationPrincipal SysUser user) {

        if (user == null) {
            return R.unauthorized();
        }

        commentService.deleteComment(id);
        return R.ok();
    }

    @GetMapping("/users/{userId}/comments")
    public R<Map<String, Object>> getUserComments(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        IPage<Comment> comments = commentService.getCommentsByUser(userId, page, size);

        List<Map<String, Object>> content = comments.getRecords().stream()
                .map(this::toCommentResponse)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("totalPages", comments.getPages());
        result.put("totalElements", comments.getTotal());

        return R.ok(result);
    }

    private Map<String, Object> toCommentResponse(Comment comment) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", comment.getId());
        result.put("content", comment.getContent());
        result.put("createTime", comment.getCreateTime());
        result.put("userId", comment.getUserId());
        result.put("username", comment.getUsername());
        return result;
    }

    // ================== 后台管理接口 ==================

    @GetMapping("/admin/comments")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Map<String, Object>> getAllComments(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long galleryId) {

        LambdaQueryWrapper<Comment> wrapper = new LambdaQueryWrapper<>();
        
        if (userId != null) {
            wrapper.eq(Comment::getUserId, userId);
        }
        if (galleryId != null) {
            wrapper.eq(Comment::getGalleryId, galleryId);
        }
        
        wrapper.orderByDesc(Comment::getCreateTime);
        
        IPage<Comment> comments = commentService.page(new Page<>(page, size), wrapper);

        List<Map<String, Object>> content = comments.getRecords().stream()
                .map(this::toAdminCommentResponse)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("content", content);
        result.put("totalPages", comments.getPages());
        result.put("totalElements", comments.getTotal());
        result.put("currentPage", page);

        return R.ok(result);
    }

    @DeleteMapping("/admin/comments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Void> deleteCommentAdmin(@PathVariable Long id) {
        commentService.deleteComment(id);
        return R.ok();
    }

    private Map<String, Object> toAdminCommentResponse(Comment comment) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", comment.getId());
        result.put("content", comment.getContent());
        result.put("createTime", comment.getCreateTime());
        result.put("userId", comment.getUserId());
        result.put("galleryId", comment.getGalleryId());
        result.put("parentId", comment.getParentId());
        return result;
    }
}
