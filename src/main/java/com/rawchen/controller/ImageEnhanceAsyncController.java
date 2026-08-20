package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.ImageTask;
import com.rawchen.entity.ModelPrice;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AsyncImageTaskExecutor;
import com.rawchen.service.ConsumeLogService;
import com.rawchen.service.ImageTaskService;
import com.rawchen.service.ModelPriceService;
import com.rawchen.service.UserBalanceService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
    private final UserBalanceService userBalanceService;
    private final ModelPriceService modelPriceService;
    private final ConsumeLogService consumeLogService;

    /**
     * 异步增强图片 - 前端已通过STS上传图片到OSS
     *
     * @param referenceUrl 参考图的OSS URL
     * @param category     图片类别
     * @param prompt       自定义提示词（可选）
     * @param model        使用的模型（默认 gpt-image-2）
     * @param user         当前登录用户
     * @return 任务ID
     */
    @PostMapping("/enhance_async")
    public R<EnhanceAsyncResponse> enhanceImageAsync(
            @RequestParam("referenceUrl") String referenceUrl,
            @RequestParam(value = "category", defaultValue = "general") String category,
            @RequestParam(value = "prompt", required = false) String prompt,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        if (referenceUrl == null || referenceUrl.trim().isEmpty()) {
            return R.badRequest("请上传图片");
        }

        // 获取模型价格并检查余额
        BigDecimal cost = modelPriceService.getPrice(model);
        if (cost.compareTo(BigDecimal.ZERO) == 0) {
            return R.badRequest("未配置该模型的价格: " + model);
        }

        if (!userBalanceService.checkBalance(user.getId(), cost)) {
            return R.forbidden("余额不足，当前需要 ¥" + cost + "，请先充值");
        }

        // 扣费
        boolean deducted = userBalanceService.deduct(user.getId(), cost);
        if (!deducted) {
            return R.forbidden("扣费失败，请稍后重试");
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
        task.setModel(model);
        task.setOriginalImageUrl(referenceUrl);
        task.setReferenceImageUrls("[\"" + referenceUrl + "\"]");
        imageTaskService.save(task);

        // 创建消费日志
        ModelPrice price = modelPriceService.getByModelCode(model);
        consumeLogService.createLog(user.getId(), taskId, "enhance", model,
                price != null ? price.getModelName() : model, null, cost);

        // 异步执行任务
        asyncImageTaskExecutor.executeEnhanceTaskWithUrl(taskId, referenceUrl, enhancePrompt);

        log.info("Enhance task {} created for user {} with model {}, cost {}", taskId, user.getId(), model, cost);

        EnhanceAsyncResponse response = new EnhanceAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
        response.setCost(cost);
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
     * 获取用户的增强任务历史列表
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

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, "enhance", status);

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
        response.setModel(task.getModel());
        response.setOriginalImageUrl(task.getOriginalImageUrl());
        response.setResultImageUrl(task.getResultImageUrl());
        response.setErrorMsg(task.getErrorMsg());
        response.setDuration(task.getDuration());
        response.setCreateTime(task.getCreateTime());
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
        private String model;
        private BigDecimal cost;
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
     * 图片响应
     */
    @Data
    public static class ImageResponse {
        private String taskId;
        private String imageUrl;
        private String prompt;
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
        private String model;
        private String originalImageUrl;
        private String resultImageUrl;
        private String errorMsg;
        private Long duration;
        private java.time.LocalDateTime createTime;
    }
}