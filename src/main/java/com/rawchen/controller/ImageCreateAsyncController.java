package com.rawchen.controller;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.ImageTask;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AsyncImageTaskExecutor;
import com.rawchen.service.ImageTaskService;
import com.rawchen.service.OssUploadService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 图像创作异步控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-create")
@RequiredArgsConstructor
public class ImageCreateAsyncController {

    private final ImageTaskService imageTaskService;
    private final AsyncImageTaskExecutor asyncImageTaskExecutor;
    private final OssUploadService ossUploadService;

    /**
     * 异步创建图片 - 纯文字生成或带参考图编辑
     *
     * @param files  上传的参考图片（可选，最多5张）
     * @param prompt 创作提示词
     * @param size   图片尺寸
     * @param user   当前登录用户
     * @return 任务ID
     */
    @PostMapping("/create_async")
    public R<CreateAsyncResponse> createImageAsync(
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam("prompt") String prompt,
            @RequestParam(value = "size", defaultValue = "1024x1024") String size,
            @AuthenticationPrincipal SysUser user) {

        if (prompt == null || prompt.trim().isEmpty()) {
            return R.badRequest("请输入描述内容");
        }

        if (files != null && files.size() > 5) {
            return R.badRequest("最多上传5张参考图片");
        }

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 处理参考图上传到OSS
        String referenceImageUrls = null;
        if (files != null && !files.isEmpty()) {
            List<String> uploadedUrls = new ArrayList<>();
            for (MultipartFile file : files) {
                try {
                    String fileName = "reference/" + UUID.randomUUID().toString().replace("-", "") + ".jpg";
                    String url = ossUploadService.uploadStream(file.getInputStream(), fileName, file.getContentType());
                    uploadedUrls.add(url);
                } catch (Exception e) {
                    log.error("Upload reference image failed: {}", e.getMessage());
                }
            }
            referenceImageUrls = JSON.toJSONString(uploadedUrls);
        }

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("create");
        task.setStatus("pending");
        task.setPrompt(prompt);
        task.setSize(size);
        task.setReferenceImageUrls(referenceImageUrls);
        imageTaskService.save(task);

        // 异步执行任务
        if (files == null || files.isEmpty()) {
            asyncImageTaskExecutor.executeCreateTask(taskId, prompt, size);
        } else {
            asyncImageTaskExecutor.executeEditTask(taskId, files, prompt, size);
        }

        CreateAsyncResponse response = new CreateAsyncResponse();
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
     * 获取图片（返回重定向到OSS地址）
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
     * 获取用户的任务历史列表
     *
     * @param page     页码
     * @param size     每页大小
     * @param taskType 任务类型（可选）
     * @param status   任务状态（可选）
     * @param user     当前登录用户
     * @return 任务列表
     */
    @GetMapping("/history")
    public R<TaskHistoryPageResponse> getHistory(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "10") Integer size,
            @RequestParam(value = "taskType", required = false) String taskType,
            @RequestParam(value = "status", required = false) String status,
            @AuthenticationPrincipal SysUser user) {

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, taskType, status);

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
        response.setReferenceImageUrls(task.getReferenceImageUrls());
        response.setResultImageUrl(task.getResultImageUrl());
        response.setErrorMsg(task.getErrorMsg());
        response.setDuration(task.getDuration());
        response.setCreateTime(task.getCreateTime());
        return R.ok(response);
    }

    /**
     * 创建异步任务响应
     */
    @Data
    public static class CreateAsyncResponse {
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
        private String referenceImageUrls;
        private String resultImageUrl;
        private String errorMsg;
        private Long duration;
        private java.time.LocalDateTime createTime;
    }
}
