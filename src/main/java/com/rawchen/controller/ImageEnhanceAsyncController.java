package com.rawchen.controller;

import com.rawchen.entity.ImageTask;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AsyncImageTaskExecutor;
import com.rawchen.service.ImageTaskService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * 图像增强异步控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-enhance")
@RequiredArgsConstructor
public class ImageEnhanceAsyncController {

    private final ImageTaskService imageTaskService;
    private final AsyncImageTaskExecutor asyncImageTaskExecutor;

    /**
     * 异步增强图片 - 前端已通过STS上传图片到OSS
     *
     * @param referenceUrl 参考图的OSS URL
     * @param category     图片类别
     * @param prompt       自定义提示词（可选）
     * @param user         当前登录用户
     * @return 任务ID
     */
    @PostMapping("/enhance_async")
    public R<EnhanceAsyncResponse> enhanceImageAsync(
            @RequestParam("referenceUrl") String referenceUrl,
            @RequestParam(value = "category", defaultValue = "general") String category,
            @RequestParam(value = "prompt", required = false) String prompt,
            @AuthenticationPrincipal SysUser user) {

        if (referenceUrl == null || referenceUrl.trim().isEmpty()) {
            return R.badRequest("请上传图片");
        }

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 构建增强提示词
        String enhancePrompt = buildEnhancePrompt(category, prompt);

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("enhance");
        task.setStatus("pending");
        task.setPrompt(enhancePrompt);
        task.setReferenceImageUrls("[\"" + referenceUrl + "\"]");
        imageTaskService.save(task);

        // 异步执行任务
        asyncImageTaskExecutor.executeEnhanceTaskWithUrl(taskId, referenceUrl, enhancePrompt);

        EnhanceAsyncResponse response = new EnhanceAsyncResponse();
        response.setTaskId(taskId);
        return R.ok(response);
    }

    /**
     * 查询任务结果
     *
     * @param id 任务ID
     * @return 任务状态
     */
    @GetMapping("/result")
    public R<TaskResultResponse> getResult(@RequestParam("id") String id) {
        ImageTask task = imageTaskService.getByTaskId(id);
        if (task == null) {
            TaskResultResponse response = new TaskResultResponse();
            response.setStatus("not_found");
            return R.ok(response);
        }

        TaskResultResponse response = new TaskResultResponse();
        response.setStatus(task.getStatus());
        if ("done".equals(task.getStatus())) {
            response.setImageUrl(task.getResultImageUrl());
        } else if ("error".equals(task.getStatus())) {
            response.setMsg(task.getErrorMsg());
        }
        return R.ok(response);
    }

    /**
     * 获取图片
     *
     * @param id 任务ID
     * @return 图片URL
     */
    @GetMapping("/image")
    public R<ImageResponse> getImage(@RequestParam("id") String id) {
        ImageTask task = imageTaskService.getByTaskId(id);
        if (task == null) {
            return R.notFound("任务不存在");
        }
        if (!"done".equals(task.getStatus())) {
            return R.badRequest("任务尚未完成");
        }
        ImageResponse response = new ImageResponse();
        response.setImageUrl(task.getResultImageUrl());
        response.setTaskId(task.getTaskId());
        response.setPrompt(task.getPrompt());
        return R.ok(response);
    }

    /**
     * 根据类别构建增强提示词
     */
    private String buildEnhancePrompt(String category, String customPrompt) {
        if (customPrompt != null && !customPrompt.trim().isEmpty()) {
            return customPrompt;
        }
        switch (category) {
            case "portrait":
                return "增强这张人像照片的质量，提高清晰度，优化肤色和光线，使其更加自然美丽";
            case "object":
                return "增强这张产品照片的质量，提高清晰度和色彩饱和度，使产品更加突出";
            case "scenery":
                return "增强这张风景照片的质量，提高清晰度，保持原有的分布颜色，使景色更加自然";
            case "pets":
                return "增强这张宠物照片的质量，提高清晰度，优化毛发细节和色彩，使宠物更加可爱";
            case "text":
                return "增强这张图片的文字清晰度，提高分辨率和对比度，使文字更加清晰可读";
            default:
                return "增强这张图片的质量，提高清晰度、色彩和分辨率，使其更加美观";
        }
    }

    /**
     * 增强异步任务响应
     */
    @Data
    public static class EnhanceAsyncResponse {
        private String taskId;
    }

    /**
     * 任务结果响应
     */
    @Data
    public static class TaskResultResponse {
        private String status;
        private String imageUrl;
        private String msg;
    }

    /**
     * 图片响应
     */
    @Data
    public static class ImageResponse {
        private String taskId;
        private String imageUrl;
        private String prompt;
    }
}