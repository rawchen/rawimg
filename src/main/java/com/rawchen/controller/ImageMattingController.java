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
 * 图像抠图控制器 - 异步模式
 */
@Slf4j
@RestController
@RequestMapping("/api/image-matting")
@RequiredArgsConstructor
public class ImageMattingController {

    private final AsyncImageTaskExecutor asyncImageTaskExecutor;
    private final ImageTaskService imageTaskService;

    /**
     * 异步图像抠图接口
     *
     * @param originalImageUrl 原始图片URL
     * @param subject          抠图主体（person/object/pet/shape/text）
     * @param bgColor          背景颜色（transparent/white/green/blue/black）
     * @param model            使用的模型（默认 gpt-image-2）
     * @param user             当前登录用户
     * @return 任务ID
     */
    @PostMapping("/matting_async")
    public R<MattingAsyncResponse> mattingImageAsync(
            @RequestParam("originalImageUrl") String originalImageUrl,
            @RequestParam("subject") String subject,
            @RequestParam("bgColor") String bgColor,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        if (originalImageUrl == null || originalImageUrl.isEmpty()) {
            return R.badRequest("请上传原始图片");
        }

        // 在后端拼接提示词
        String prompt = generatePrompt(subject, bgColor);

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("matting");
        task.setStatus("pending");
        task.setPrompt(prompt);
        task.setModel(model);
        task.setOriginalImageUrl(originalImageUrl);
        imageTaskService.save(task);

        // 异步执行抠图任务
        asyncImageTaskExecutor.executeMattingTask(taskId, originalImageUrl, prompt, model);

        log.info("Matting task {} created for user {} with model {}", taskId, user.getId(), model);

        MattingAsyncResponse response = new MattingAsyncResponse();
        response.setTaskId(taskId);
        response.setModel(model);
        return R.ok(response);
    }

    /**
     * 生成抠图提示词
     */
    private String generatePrompt(String subject, String bgColor) {
        String subjectLabel = getSubjectLabel(subject);
        String bgColorLabel = getBgColorLabel(bgColor);
        return "选取画面中的" + subjectLabel + "以外部分设为" + bgColorLabel;
    }

    private String getSubjectLabel(String subject) {
        switch (subject) {
            case "person": return "人像";
            case "object": return "物体";
            case "pet": return "宠物";
            case "shape": return "图形";
            case "text": return "文字";
            default: return "主体";
        }
    }

    private String getBgColorLabel(String bgColor) {
        switch (bgColor) {
            case "transparent": return "透明";
            case "white": return "白色";
            case "green": return "绿色";
            case "blue": return "蓝色";
            case "black": return "黑色";
            default: return "透明";
        }
    }

    /**
     * 查询抠图任务结果
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
     * 获取用户的抠图任务历史列表
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

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, "matting", status);

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
     * 异步抠图响应
     */
    @Data
    public static class MattingAsyncResponse {
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
