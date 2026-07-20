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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 图像智能换装异步控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-clothes")
@RequiredArgsConstructor
public class ImageClothesAsyncController {

    private final ImageTaskService imageTaskService;
    private final AsyncImageTaskExecutor asyncImageTaskExecutor;

    /**
     * 异步智能换装 - 前端已通过OSS上传图片
     *
     * @param personImageUrl   人物图片的OSS URL
     * @param clothesImageUrls 衣服图片URL列表（JSON数组字符串）
     * @param prompt           换装提示词
     * @param size             图片尺寸
     * @param model            使用的模型（默认 gpt-image-2）
     * @param user             当前登录用户
     * @return 任务ID
     */
    @PostMapping("/clothes_async")
    public R<ClothesAsyncResponse> clothesImageAsync(
            @RequestParam("personImageUrl") String personImageUrl,
            @RequestParam("clothesImageUrls") String clothesImageUrls,
            @RequestParam("prompt") String prompt,
            @RequestParam(value = "size", defaultValue = "1920x1080") String size,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        if (personImageUrl == null || personImageUrl.trim().isEmpty()) {
            return R.badRequest("请上传人物图片");
        }

        if (clothesImageUrls == null || clothesImageUrls.trim().isEmpty()) {
            return R.badRequest("请上传服装图片");
        }

        // 解析衣服图片URL列表
        List<String> clothesUrls;
        try {
            clothesUrls = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(clothesImageUrls, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.error("Failed to parse clothesImageUrls: {}", clothesImageUrls, e);
            return R.badRequest("服装图片URL格式错误");
        }

        if (clothesUrls == null || clothesUrls.isEmpty()) {
            return R.badRequest("请至少上传一张服装图片");
        }

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("clothes");
        task.setStatus("pending");
        task.setPrompt(prompt);
        task.setSize(size);
        task.setModel(model);
        task.setOriginalImageUrl(personImageUrl);
        task.setReferenceImageUrls(clothesImageUrls);
        imageTaskService.save(task);

        // 异步执行任务
        asyncImageTaskExecutor.executeClothesTask(taskId, personImageUrl, clothesUrls, prompt, size, model);

        log.info("Clothes task {} created for user {} with model {}", taskId, user.getId(), model);

        ClothesAsyncResponse response = new ClothesAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
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
            response.setOriginalImageUrl(task.getOriginalImageUrl());
        } else if ("error".equals(task.getStatus())) {
            response.setMsg(task.getErrorMsg());
        }
        return R.ok(response);
    }

    /**
     * 获取用户的智能换装任务历史列表
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

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, "clothes", status);

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
        response.setModel(task.getModel());
        response.setOriginalImageUrl(task.getOriginalImageUrl());
        response.setReferenceImageUrls(task.getReferenceImageUrls());
        response.setResultImageUrl(task.getResultImageUrl());
        response.setErrorMsg(task.getErrorMsg());
        response.setDuration(task.getDuration());
        response.setCreateTime(task.getCreateTime());
        return R.ok(response);
    }

    /**
     * 换装异步任务响应
     */
    @Data
    public static class ClothesAsyncResponse {
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
        private String model;
        private String originalImageUrl;
        private String referenceImageUrls;
        private String resultImageUrl;
        private String errorMsg;
        private Long duration;
        private LocalDateTime createTime;
    }
}
