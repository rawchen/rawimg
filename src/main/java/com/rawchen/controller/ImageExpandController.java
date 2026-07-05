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
 * 图像扩展控制器 - 异步模式
 */
@Slf4j
@RestController
@RequestMapping("/api/image-expand")
@RequiredArgsConstructor
public class ImageExpandController {

    private final AsyncImageTaskExecutor asyncImageTaskExecutor;
    private final ImageTaskService imageTaskService;

    /**
     * 异步图像扩展接口
     *
     * @param originalImageUrl 原始图片URL（用户上传的原图）
     * @param maskImageUrl     遮罩图片URL（原图内容+透明扩展区域）
     * @param size             扩展后的图片尺寸
     * @param model            使用的模型（默认 gpt-image-2）
     * @param user             当前登录用户
     * @return 任务ID
     */
    @PostMapping("/expand_async")
    public R<ExpandAsyncResponse> expandImageAsync(
            @RequestParam("originalImageUrl") String originalImageUrl,
            @RequestParam("maskImageUrl") String maskImageUrl,
            @RequestParam("size") String size,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        if (originalImageUrl == null || originalImageUrl.isEmpty()) {
            return R.badRequest("请上传原始图片");
        }

        if (maskImageUrl == null || maskImageUrl.isEmpty()) {
            return R.badRequest("请上传遮罩图片");
        }

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("expand");
        task.setStatus("pending");
        task.setSize(size);
        task.setModel(model);
        task.setOriginalImageUrl(originalImageUrl);
        task.setMaskImageUrl(maskImageUrl);
        imageTaskService.save(task);

        // 异步执行扩展任务
        asyncImageTaskExecutor.executeExpandTask(taskId, originalImageUrl, maskImageUrl, size, model);

        log.info("Expand task {} created for user {} with model {}", taskId, user.getId(), model);

        ExpandAsyncResponse response = new ExpandAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
        return R.ok(response);
    }

    /**
     * 查询扩展任务结果
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
            response.setMaskImageUrl(task.getMaskImageUrl());
        } else if ("error".equals(task.getStatus())) {
            response.setMsg(task.getErrorMsg());
        }
        return R.ok(response);
    }

    /**
     * 获取用户的扩展任务历史列表
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

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, "expand", status);

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
        response.setSize(task.getSize());
        response.setOriginalImageUrl(task.getOriginalImageUrl());
        response.setMaskImageUrl(task.getMaskImageUrl());
        response.setResultImageUrl(task.getResultImageUrl());
        response.setErrorMsg(task.getErrorMsg());
        response.setDuration(task.getDuration());
        response.setCreateTime(task.getCreateTime());
        return R.ok(response);
    }

    /**
     * 异步扩展响应
     */
    @Data
    public static class ExpandAsyncResponse {
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
        private String maskImageUrl;
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
        private String size;
        private String originalImageUrl;
        private String maskImageUrl;
        private String resultImageUrl;
        private String errorMsg;
        private Long duration;
        private java.time.LocalDateTime createTime;
    }
}