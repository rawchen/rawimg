package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
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

import java.util.List;
import java.util.UUID;

/**
 * 老照片修复控制器 - 异步模式
 */
@Slf4j
@RestController
@RequestMapping("/api/image-restore")
@RequiredArgsConstructor
public class ImageRestoreController {

    private final AsyncImageTaskExecutor asyncImageTaskExecutor;
    private final ImageTaskService imageTaskService;

    /**
     * 异步老照片修复接口
     *
     * @param originalImageUrl 原始图片URL
     * @param colorMode        颜色模式（bw/color，黑白/彩色）
     * @param grainMode        颗粒模式（clean/real，干净/真实）
     * @param clarity          清晰度（medium/high，中/高）
     * @param model            使用的模型（默认 gpt-image-2）
     * @param user             当前登录用户
     * @return 任务ID
     */
    @PostMapping("/restore_async")
    public R<RestoreAsyncResponse> restoreImageAsync(
            @RequestParam("originalImageUrl") String originalImageUrl,
            @RequestParam("colorMode") String colorMode,
            @RequestParam("grainMode") String grainMode,
            @RequestParam("clarity") String clarity,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        if (originalImageUrl == null || originalImageUrl.isEmpty()) {
            return R.badRequest("请上传原始图片");
        }

        // 在后端拼接提示词
        String prompt = generatePrompt(colorMode, grainMode, clarity);

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("restore");
        task.setStatus("pending");
        task.setPrompt(prompt);
        task.setModel(model);
        task.setOriginalImageUrl(originalImageUrl);
        imageTaskService.save(task);

        // 异步执行修复任务
        asyncImageTaskExecutor.executeRestoreTask(taskId, originalImageUrl, prompt, model);

        log.info("Restore task {} created for user {} with model {}", taskId, user.getId(), model);

        RestoreAsyncResponse response = new RestoreAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
        return R.ok(response);
    }

    /**
     * 生成老照片修复提示词
     * 默认包含修复划痕、折痕、污点，保留原脸更多细节
     */
    private String generatePrompt(String colorMode, String grainMode, String clarity) {
        StringBuilder sb = new StringBuilder();
        sb.append("修复老照片，修复划痕、折痕、污点，保留原脸更多细节");

        // 颜色模式
        if ("color".equals(colorMode)) {
            sb.append("，增强色彩饱和度，修复褪色");
        } else {
            sb.append("，保持黑白效果");
        }

        // 颗粒模式
        if ("clean".equals(grainMode)) {
            sb.append("，去除噪点和胶片颗粒，使画面干净清晰");
        } else {
            sb.append("，保留胶片颗粒质感");
        }

        // 清晰度
        if ("high".equals(clarity)) {
            sb.append("，超高清细节增强");
        } else {
            sb.append("，适度清晰度提升");
        }

        return sb.toString();
    }

    /**
     * 查询修复任务结果
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
            response.setOriginalImageUrl(task.getOriginalImageUrl());
        } else if ("error".equals(task.getStatus())) {
            response.setMsg(task.getErrorMsg());
        }
        return R.ok(response);
    }

    /**
     * 获取用户的修复任务历史列表
     *
     * @param page   页码
     * @param size   每页大小
     * @param status 任务状态（可选）
     * @param user   当前登录用户
     * @return 任务列表
     */
    @GetMapping("/history")
    public R<TaskHistoryPageResponse> getHistory(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "12") Integer size,
            @RequestParam(value = "status", required = false) String status,
            @AuthenticationPrincipal SysUser user) {

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, "restore", status);

        TaskHistoryPageResponse response = new TaskHistoryPageResponse();
        response.setRecords(taskPage.getRecords());
        response.setTotal(taskPage.getTotal());
        response.setPages(taskPage.getPages());
        response.setCurrent(taskPage.getCurrent());
        response.setSize(taskPage.getSize());
        return R.ok(response);
    }

    /**
     * 获取任务详情
     *
     * @param id   任务ID
     * @param user 当前登录用户
     * @return 任务详情
     */
    @GetMapping("/task/{id}")
    public R<TaskDetailResponse> getTaskDetail(
            @PathVariable("id") String id,
            @AuthenticationPrincipal SysUser user) {
        ImageTask task = imageTaskService.getByTaskId(id);
        if (task == null) {
            return R.notFound("任务不存在");
        }
        // 验证任务属于当前用户
        if (!task.getUserId().equals(user.getId())) {
            return R.forbidden("无权访问此任务");
        }

        TaskDetailResponse response = new TaskDetailResponse();
        response.setTaskId(task.getTaskId());
        response.setTaskType(task.getTaskType());
        response.setStatus(task.getStatus());
        response.setPrompt(task.getPrompt());
        response.setSize(task.getSize());
        response.setOriginalImageUrl(task.getOriginalImageUrl());
        response.setResultImageUrl(task.getResultImageUrl());
        response.setErrorMsg(task.getErrorMsg());
        response.setDuration(task.getDuration());
        response.setCreateTime(task.getCreateTime());
        return R.ok(response);
    }

    /**
     * 异步修复响应
     */
    @Data
    public static class RestoreAsyncResponse {
        private String taskId;
        private String model;
    }

    /**
     * 任务结果响应
     */
    @Data
    public static class TaskResultResponse {
        private String status;
        private String imageUrl;
        private String originalImageUrl;
        private String msg;
    }

    /**
     * 任务历史分页响应
     */
    @Data
    public static class TaskHistoryPageResponse {
        private List<ImageTask> records;
        private Long total;
        private Long pages;
        private Long current;
        private Long size;
    }

    /**
     * 任务详情响应
     */
    @Data
    public static class TaskDetailResponse {
        private String taskId;
        private String taskType;
        private String status;
        private String prompt;
        private String size;
        private String originalImageUrl;
        private String resultImageUrl;
        private String errorMsg;
        private Long duration;
        private java.time.LocalDateTime createTime;
    }
}
