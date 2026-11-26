package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.ImageTask;
import com.rawchen.entity.MaterialAsset;
import com.rawchen.entity.ModelPrice;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AsyncImageTaskExecutor;
import com.rawchen.service.ClothesPromptService;
import com.rawchen.service.ConsumeLogService;
import com.rawchen.service.ImageTaskRejectHandler;
import com.rawchen.service.ImageTaskService;
import com.rawchen.service.MaterialLibraryService;
import com.rawchen.service.ModelPriceService;
import com.rawchen.service.UserBalanceService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.RejectedExecutionException;

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
    private final UserBalanceService userBalanceService;
    private final ModelPriceService modelPriceService;
    private final ConsumeLogService consumeLogService;
    private final ImageTaskRejectHandler imageTaskRejectHandler;
    private final MaterialLibraryService materialLibraryService;
    private final ClothesPromptService clothesPromptService;

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
            @RequestParam(value = "size", defaultValue = "1536x864") String size,
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

        // 创建消费日志
        ModelPrice price = modelPriceService.getByModelCode(model);
        consumeLogService.createLog(user.getId(), taskId, "clothes", model,
                price != null ? price.getModelName() : model, null, cost);

        // 异步执行任务（队列满时立即拒绝并退还费用，绝不让 HTTP 线程代跑）
        try {
            asyncImageTaskExecutor.executeClothesTask(taskId, personImageUrl, clothesUrls, prompt, size, model);
        } catch (RejectedExecutionException e) {
            return imageTaskRejectHandler.reject(taskId, user.getId(), cost);
        }

        log.info("Clothes task {} created for user {} with model {}, cost {}", taskId, user.getId(), model, cost);

        ClothesAsyncResponse response = new ClothesAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
        response.setCost(cost);
        return R.ok(response);
    }

    /**
     * 异步智能换装（素材库模式：人物图 + 服装图 + 姿态图 三张参考图）
     * <p>
     * 参考图顺序固定为：图1=人物、图2=服装、图3=姿态，
     * 提示词由后端按「人物素材 + 服装素材 + 姿态素材 + 风格」统一拼接，保证前后端一致。
     *
     * @param personAssetId  人物素材ID（素材库选择时传入；使用自己上传的人物图时可为空）
     * @param personImageUrl 自己上传的人物图片OSS URL（personAssetId 为空时必填）
     * @param costumeAssetId 服装素材ID
     * @param poseAssetId    姿态素材ID
     * @param styleCode      风格编码
     * @param prompt         前端提示词快照（可选，最终以后端拼接结果为准）
     * @param size           图片尺寸
     * @param model          使用的模型
     * @param user           当前登录用户
     * @return 任务ID
     */
    @PostMapping("/material_async")
    public R<ClothesAsyncResponse> materialClothesImageAsync(
            @RequestParam(value = "personAssetId", required = false) Long personAssetId,
            @RequestParam(value = "personImageUrl", required = false) String personImageUrl,
            @RequestParam("costumeAssetId") Long costumeAssetId,
            @RequestParam("poseAssetId") Long poseAssetId,
            @RequestParam(value = "styleCode", defaultValue = "realistic_portrait") String styleCode,
            @RequestParam(value = "prompt", required = false) String prompt,
            @RequestParam(value = "size", defaultValue = "1536x864") String size,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        // ---------- 解析素材 ----------
        MaterialAsset personAsset = personAssetId == null ? null
                : materialLibraryService.getById(personAssetId);
        MaterialAsset costumeAsset = materialLibraryService.getById(costumeAssetId);
        MaterialAsset poseAsset = materialLibraryService.getById(poseAssetId);

        if (costumeAsset == null || costumeAsset.getStatus() == null || costumeAsset.getStatus() != 1) {
            return R.badRequest("请选择有效的服装素材");
        }
        if (poseAsset == null || poseAsset.getStatus() == null || poseAsset.getStatus() != 1) {
            return R.badRequest("请选择有效的姿态素材");
        }
        if (personAsset != null && (personAsset.getStatus() == null || personAsset.getStatus() != 1)) {
            return R.badRequest("请选择有效的人物素材");
        }

        // 图1：优先使用素材库人物图，否则使用用户上传的人物图
        String personUrl = personAsset != null
                ? firstNotBlank(personAsset.getFullUrl(), personAsset.getPreviewUrl(), personAsset.getThumbUrl())
                : personImageUrl;
        if (personUrl == null || personUrl.trim().isEmpty()) {
            return R.badRequest("请选择人物素材或上传人物图片");
        }

        String costumeUrl = firstNotBlank(costumeAsset.getFullUrl(), costumeAsset.getPreviewUrl(), costumeAsset.getThumbUrl());
        String poseUrl = firstNotBlank(poseAsset.getFullUrl(), poseAsset.getPreviewUrl(), poseAsset.getThumbUrl());
        if (costumeUrl == null || poseUrl == null) {
            return R.badRequest("素材图片缺失，请重新选择");
        }

        // ---------- 拼接提示词 ----------
        String finalPrompt = clothesPromptService.buildPrompt(styleCode, personAsset, costumeAsset, poseAsset);

        // ---------- 价格与余额 ----------
        BigDecimal cost = modelPriceService.getPrice(model);
        if (cost.compareTo(BigDecimal.ZERO) == 0) {
            return R.badRequest("未配置该模型的价格: " + model);
        }
        if (!userBalanceService.checkBalance(user.getId(), cost)) {
            return R.forbidden("余额不足，当前需要 ¥" + cost + "，请先充值");
        }
        boolean deducted = userBalanceService.deduct(user.getId(), cost);
        if (!deducted) {
            return R.forbidden("扣费失败，请稍后重试");
        }

        // ---------- 创建任务 ----------
        String taskId = UUID.randomUUID().toString();
        List<String> referenceUrls = Arrays.asList(costumeUrl, poseUrl);
        String referenceJson;
        try {
            referenceJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(referenceUrls);
        } catch (Exception e) {
            log.error("Failed to serialize reference image urls: {}", e.getMessage());
            return R.badRequest("参考图地址序列化失败");
        }

        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("clothes");
        task.setStatus("pending");
        task.setPrompt(finalPrompt);
        task.setSize(size);
        task.setModel(model);
        task.setOriginalImageUrl(personUrl);
        task.setReferenceImageUrls(referenceJson);
        imageTaskService.save(task);

        ModelPrice price = modelPriceService.getByModelCode(model);
        consumeLogService.createLog(user.getId(), taskId, "clothes", model,
                price != null ? price.getModelName() : model, null, cost);

        try {
            asyncImageTaskExecutor.executeClothesTask(taskId, personUrl, referenceUrls, finalPrompt, size, model, finalPrompt);
        } catch (RejectedExecutionException e) {
            return imageTaskRejectHandler.reject(taskId, user.getId(), cost);
        }

        log.info("Material clothes task {} created for user {} style {} model {} cost {}",
                taskId, user.getId(), styleCode, model, cost);

        ClothesAsyncResponse response = new ClothesAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
        response.setCost(cost);
        return R.ok(response);
    }

    private String firstNotBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value;
            }
        }
        return null;
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
