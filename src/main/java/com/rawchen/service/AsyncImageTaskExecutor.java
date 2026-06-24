package com.rawchen.service;

import com.rawchen.entity.ImageTask;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
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
     * 异步执行图片创作任务（带参考图编辑）- 通过URL
     * @param referenceUrls 参考图URL列表
     */
    @Async("imageTaskExecutor")
    public void executeEditTaskWithUrls(String taskId, List<String> referenceUrls, String prompt, String size) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async edit task {} started with {} URLs", taskId, referenceUrls.size());

            // 从URL下载图片到内存
            List<MultipartFile> files = new ArrayList<>();
            for (int i = 0; i < referenceUrls.size(); i++) {
                String url = referenceUrls.get(i);
                try {
                    byte[] imageData = downloadImageFromUrl(url);
                    String fileName = "reference_" + i + ".jpg";
                    files.add(new MemoryMultipartFile(imageData, fileName));
                } catch (Exception e) {
                    log.error("Failed to download image from {}: {}", url, e.getMessage());
                    throw new RuntimeException("下载参考图失败: " + e.getMessage());
                }
            }

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
     * 从URL下载图片到内存
     */
    private byte[] downloadImageFromUrl(String imageUrl) throws IOException {
        java.net.URL url = new java.net.URL(imageUrl);
        try (InputStream is = url.openStream();
             java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                baos.write(buffer, 0, bytesRead);
            }
            return baos.toByteArray();
        }
    }

    /**
     * 异步执行图片增强任务 - 通过URL
     * @param referenceUrl 参考图URL
     */
    @Async("imageTaskExecutor")
    public void executeEnhanceTaskWithUrl(String taskId, String referenceUrl, String prompt) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async enhance task {} started", taskId);

            // 从URL下载图片到内存
            byte[] imageData = downloadImageFromUrl(referenceUrl);
            MultipartFile file = new MemoryMultipartFile(imageData, "reference.jpg");

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
     * 异步执行图片创作任务（带参考图编辑）
     * @param fileDataList 文件内容列表（已读入内存）
     */
    @Async("imageTaskExecutor")
    public void executeEditTask(String taskId, List<byte[]> fileDataList, List<String> fileNames, String prompt, String size) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async edit task {} started with {} files", taskId, fileDataList.size());
            // 将byte[]转换为MultipartFile
            List<MultipartFile> files = new ArrayList<>();
            for (int i = 0; i < fileDataList.size(); i++) {
                files.add(new MemoryMultipartFile(fileDataList.get(i), fileNames.get(i)));
            }
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
     * @param fileData 文件内容（已读入内存）
     */
    @Async("imageTaskExecutor")
    public void executeEnhanceTask(String taskId, byte[] fileData, String fileName, String prompt) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async enhance task {} started", taskId);
            MultipartFile file = new MemoryMultipartFile(fileData, fileName);
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

    /**
     * 内存中的MultipartFile实现
     */
    private static class MemoryMultipartFile implements MultipartFile {
        private final byte[] content;
        private final String name;

        public MemoryMultipartFile(byte[] content, String name) {
            this.content = content;
            this.name = name;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getOriginalFilename() {
            return name;
        }

        @Override
        public String getContentType() {
            if (name.endsWith(".png")) return "image/png";
            if (name.endsWith(".gif")) return "image/gif";
            if (name.endsWith(".webp")) return "image/webp";
            return "image/jpeg";
        }

        @Override
        public boolean isEmpty() {
            return content == null || content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() throws IOException {
            return content;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException, IllegalStateException {
            new java.io.FileOutputStream(dest).write(content);
        }
    }
}
