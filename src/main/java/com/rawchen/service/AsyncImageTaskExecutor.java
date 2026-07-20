package com.rawchen.service;

import com.rawchen.entity.ImageTask;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${aliyun.oss.custom-domain}")
    private String customDomain;

    /**
     * 异步执行图片创作任务（纯文字生成）
     */
    @Async("imageTaskExecutor")
    public void executeCreateTask(String taskId, String prompt, String size, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async create task {} started with model {}", taskId, model);
            String result = gptUtil.generateImage(prompt, size, model);
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
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeEditTaskWithUrls(String taskId, List<String> referenceUrls, String prompt, String size, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async edit task {} started with {} URLs, model {}", taskId, referenceUrls.size(), model);

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

            String result = gptUtil.editImage(files, prompt, size, model);
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
        // 确保 URL 有协议前缀
        String normalizedUrl = imageUrl;
        if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
            normalizedUrl = "https://" + imageUrl;
        }
        java.net.URL url = new java.net.URL(normalizedUrl);

        // 使用 HttpURLConnection 添加 Referer 头绕过防盗链
        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
        conn.setRequestProperty("Referer", "https://" + customDomain);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);

        try (InputStream is = conn.getInputStream();
             java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                baos.write(buffer, 0, bytesRead);
            }
            return baos.toByteArray();
        } finally {
            conn.disconnect();
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
     * 异步执行图片抠图任务
     * @param taskId 任务ID
     * @param originalImageUrl 原始图片URL
     * @param prompt 抠图提示词
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeMattingTask(String taskId, String originalImageUrl, String prompt, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async matting task {} started with model {}", taskId, model);

            // 从URL下载图片到内存
            byte[] imageData = downloadImageFromUrl(originalImageUrl);
            MultipartFile file = new MemoryMultipartFile(imageData, "matting_original.png");

            // 调用GPT抠图API
            String result = gptUtil.mattingImage(file, prompt, model);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
            log.info("Async matting task {} completed in {}ms", taskId, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async matting task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行老照片修复任务
     * @param taskId 任务ID
     * @param originalImageUrl 原始图片URL
     * @param prompt 修复提示词
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeRestoreTask(String taskId, String originalImageUrl, String prompt, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async restore task {} started with model {}", taskId, model);

            // 从URL下载图片到内存
            byte[] imageData = downloadImageFromUrl(originalImageUrl);
            MultipartFile file = new MemoryMultipartFile(imageData, "restore_original.jpg");

            // 调用GPT修复API（使用mattingImage方法，因为它支持图片编辑）
            String result = gptUtil.restoreImage(file, prompt, model);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
            log.info("Async restore task {} completed in {}ms", taskId, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async restore task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行图片扩展任务
     * @param taskId 任务ID
     * @param originalImageUrl 原始图片URL
     * @param maskImageUrl 遮罩图片URL（原图内容+透明扩展区域）
     * @param size 扩展后的图片尺寸
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeExpandTask(String taskId, String originalImageUrl, String maskImageUrl, String size, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async expand task {} started with model {}", taskId, model);

            // 调用GPT扩展API，maskUrl直接传递URL（API支持）
            String result = gptUtil.expandImage(originalImageUrl, maskImageUrl, size, model);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
            log.info("Async expand task {} completed in {}ms", taskId, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async expand task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行局部改图任务
     * @param taskId 任务ID
     * @param originalImageUrl 原始图片URL
     * @param maskImageUrl 遮罩图片URL（纯橘色选区+透明背景）
     * @param prompt 编辑提示词
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeEditInpaintTask(String taskId, String originalImageUrl, String maskImageUrl, String prompt, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async edit inpaint task {} started with model {}", taskId, model);

            // 调用GPT局部改图API
            String result = gptUtil.inpaintImage(originalImageUrl, maskImageUrl, prompt, model);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
            log.info("Async edit inpaint task {} completed in {}ms", taskId, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async edit inpaint task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行智能美颜任务
     * @param taskId 任务ID
     * @param originalImageUrl 原始图片URL
     * @param prompt 美颜提示词
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeBeautyTask(String taskId, String originalImageUrl, String prompt, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async beauty task {} started with model {}", taskId, model);

            // 从URL下载图片到内存
            byte[] imageData = downloadImageFromUrl(originalImageUrl);
            MultipartFile file = new MemoryMultipartFile(imageData, "beauty_original.jpg");

            // 添加美颜前缀提示词
            String fullPrompt = "对图片进行智能美颜处理：" + prompt + "。保持自然真实的效果，不要过度处理。";

            // 调用GPT美颜API（复用mattingImage方法，因为参数结构相同）
            String result = gptUtil.mattingImage(file, fullPrompt, model);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
            log.info("Async beauty task {} completed in {}ms", taskId, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async beauty task {} failed: {}", taskId, e.getMessage());
            imageTaskService.updateError(taskId, e.getMessage(), duration);
        }
    }

    /**
     * 异步执行智能换装任务
     * @param taskId 任务ID
     * @param personImageUrl 人物图片URL
     * @param clothesImageUrls 衣服图片URL列表
     * @param prompt 换装提示词
     * @param size 图片尺寸
     * @param model 使用的模型
     */
    @Async("imageTaskExecutor")
    public void executeClothesTask(String taskId, String personImageUrl, List<String> clothesImageUrls, String prompt, String size, String model) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("Async clothes task {} started with {} clothes images, model {}", taskId, clothesImageUrls.size(), model);

            // 下载人物图片
            byte[] personImageData = downloadImageFromUrl(personImageUrl);
            MultipartFile personFile = new MemoryMultipartFile(personImageData, "person.jpg");

            // 下载衣服图片
            List<MultipartFile> clothesFiles = new ArrayList<>();
            for (int i = 0; i < clothesImageUrls.size(); i++) {
                String clothesUrl = clothesImageUrls.get(i);
                try {
                    byte[] clothesData = downloadImageFromUrl(clothesUrl);
                    clothesFiles.add(new MemoryMultipartFile(clothesData, "clothes_" + i + ".jpg"));
                } catch (Exception e) {
                    log.error("Failed to download clothes image from {}: {}", clothesUrl, e.getMessage());
                    throw new RuntimeException("下载服装图片失败: " + e.getMessage());
                }
            }

            // 构建完整的图片列表（人物图片 + 衣服图片）
            List<MultipartFile> allFiles = new ArrayList<>();
            allFiles.add(personFile);
            allFiles.addAll(clothesFiles);

            // 构建换装提示词
            String fullPrompt = "请将提供的服装图片应用到人物身上，保持人物原有的姿势、表情和背景。" +
                    "确保服装自然贴合人物身形，注意服装的透视和光影效果要与环境协调。" +
                    "如果有多个服装单品，请合理搭配穿着。";

            // 调用GPT编辑API
            String result = gptUtil.editImage(allFiles, fullPrompt, size, model);
            String ossUrl = uploadResultToOss(result);
            long duration = System.currentTimeMillis() - startTime;
            imageTaskService.updateSuccess(taskId, ossUrl, duration);
            log.info("Async clothes task {} completed in {}ms", taskId, duration);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Async clothes task {} failed: {}", taskId, e.getMessage());
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
            String result = gptUtil.editImage(files, prompt, size, null);
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
