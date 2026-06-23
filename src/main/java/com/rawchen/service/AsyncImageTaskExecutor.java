package com.rawchen.service;

import com.rawchen.entity.ImageTask;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 异步图像任务执行器
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncImageTaskExecutor {

    private final GptUtil gptUtil;
    private final ImageTaskService imageTaskService;
    private final OssUploadService ossUploadService;

    /**
     * 异步执行图片创作任务（纯文字生成）
     */
    @Async("imageTaskExecutor")
    public void executeCreateTask(String taskId, String prompt, String size) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async create task {} started", taskId);
            String result = gptUtil.generateImage(prompt, size);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async create task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行图片创作任务（带参考图编辑）
     */
    @Async("imageTaskExecutor")
    public void executeEditTask(String taskId, List<MultipartFile> files, String prompt, String size) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async edit task {} started with {} files", taskId, files.size());
            String result = gptUtil.editImage(files, prompt, size);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async edit task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行图片增强任务
     */
    @Async("imageTaskExecutor")
    public void executeEnhanceTask(String taskId, MultipartFile file, String prompt) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async enhance task {} started", taskId);
            String result = gptUtil.enhanceImage(file, prompt);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async enhance task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 将GPT返回的结果上传到OSS
     * GPT返回的可能是URL，也可能是Base64数据
     */
    private String uploadResultToOss(String gptResult) {
        if (gptResult.startsWith("data:image/")) {
            // Base64数据
            String fileName = "task/" + java.util.UUID.randomUUID().toString().replace("-", "") + ".jpeg";
            return ossUploadService.uploadBase64Image(gptResult, fileName);
        } else {
            // URL - 下载后上传到OSS
            String fileName = "task/" + java.util.UUID.randomUUID().toString().replace("-", "") + ".jpeg";
            return ossUploadService.uploadFromUrl(gptResult, fileName);
        }
    }
}
