package com.rawchen.util;

import cn.hutool.core.io.FileUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * GPT图像处理工具类
 */
@Slf4j
@Component
public class GptUtil {

    @Value("${gpt.image.api-url}")
    private String apiUrl;

    @Value("${gpt.image.api-key}")
    private String apiKey;

    @Value("${gpt.image.api-key-hr}")
    private String apiKeyHr;

    @Value("${gpt.image.model}")
    private String model;

    /**
     * 判断尺寸是否为高分辨率(2K/4K)
     */
    private boolean isHighResolution(String size) {
        if (size == null || size.isEmpty()) {
            return false;
        }
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                // 2K: 2560x1440, 4K: 3840x2160 等高分辨率
                return width >= 2048 || height >= 2048;
            }
        } catch (NumberFormatException ignored) {
        }
        return false;
    }

    /**
     * 判断是否为2K分辨率
     */
    private boolean is2K(String size) {
        if (size == null || size.isEmpty()) return false;
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                return (width == 2560 && height == 1440) || (width == 1440 && height == 2560);
            }
        } catch (NumberFormatException ignored) {}
        return false;
    }

    /**
     * 判断是否为4K分辨率
     */
    private boolean is4K(String size) {
        if (size == null || size.isEmpty()) return false;
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                return (width == 3840 && height == 2160) || (width == 2160 && height == 3840);
            }
        } catch (NumberFormatException ignored) {}
        return false;
    }

    /**
     * 判断是否为nano模型
     */
    private boolean isNanoModel(String modelParam) {
        if (modelParam == null) return false;
        return modelParam.startsWith("gemini") || modelParam.startsWith("nano");
    }

    /**
     * 获取实际的模型名称（nano模型根据分辨率调整）
     */
    private String getEffectiveModel(String modelParam, String size) {
        if (modelParam == null) return model;
        if (!isNanoModel(modelParam)) return modelParam;

        // nano模型根据分辨率调整模型名
        if (is4K(size)) {
            return "gemini-3.1-flash-image-preview-4k";
        } else if (is2K(size)) {
            return "gemini-3.1-flash-image-preview-2k";
        }
        return "gemini-3.1-flash-image-preview";
    }

    /**
     * 根据尺寸和模型获取对应的API Key
     * nano模型始终使用默认apiKey，其他模型高分辨率使用apiKeyHr
     */
    private String getApiKeyBySizeAndModel(String size, String modelParam) {
        if (isNanoModel(modelParam)) {
            return apiKey; // nano模型始终使用默认key
        }
        return isHighResolution(size) ? apiKeyHr : apiKey;
    }

    @Value("${oss.custom-domain:cdn.rawchen.com}")
    private String cdnDomain;

    /**
     * 调用GPT图像编辑API增强图片
     *
     * @param file   上传的图片文件
     * @param prompt 增强提示词
     * @return 增强后的图片URL或Base64数据
     */
    public String enhanceImage(MultipartFile file, String prompt) {
        File tempFile = null;
        try {
            // 将MultipartFile转为临时文件
            tempFile = File.createTempFile("gpt_upload_", "_" + file.getOriginalFilename());
            file.transferTo(tempFile);

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpResponse response = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", tempFile)
                    .form("model", model)
                    .form("prompt", prompt)
                    .timeout(120000)
                    .execute();

            String body = response.body();
            log.info("GPT image API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                // GPT image edit response: { "data": [ { "url": "..." } ] } or { "data": [ { "b64_json": "..." } ] }
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/png;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT image API unexpected response: {}", body);
                throw new RuntimeException("图像增强失败，API返回异常");
            } else {
                log.error("GPT image API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("图像增强失败: " + response.getStatus());
            }
        } catch (IOException e) {
            log.error("GPT image API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                FileUtil.del(tempFile);
            }
        }
    }

    /**
     * 调用GPT图像扩展API - 扩展图片边界
     *
     * @param imageUrl 合成图片URL（白色背景+原图按位置摆放）
     * @param maskUrl  遮罩图片URL（原图部分黑色#000000，扩展部分白色#ffffff）
     * @param size     扩展后的图片尺寸
     * @param model    使用的模型名称
     * @return 扩展后的图片URL或Base64数据
     */
    public String expandImage(String imageUrl, String maskUrl, String size, String model) {
        // 固定提示词，不暴露给前端
        String prompt = "自然地扩展图像边界，保持风格和内容的连贯性，生成与原图风格一致的背景内容，原图保持不变";

        File imageFile = null;
        File maskFile = null;
        try {
            // 从URL下载图片到临时文件
            imageFile = downloadUrlToFile(imageUrl, "gpt_image_");
//            maskFile = downloadUrlToFile(maskUrl, "gpt_mask_");

            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveApiKey = getApiKeyBySizeAndModel(size, model);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("image", imageFile)
                    .form("mask", maskUrl)
                    .form("model", model)
                    .form("input_fidelity", "high")
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            // 添加尺寸参数
            if (size != null && !size.isEmpty()) {
                request.form("size", size);
            }

            HttpResponse response = request.execute();
            String body = response.body();
            log.info("GPT image expand API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/png;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT image expand API unexpected response: {}", body);
                throw new RuntimeException("图像扩展失败，API返回异常");
            } else {
                log.error("GPT image expand API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("图像扩展失败: " + body);
            }
        } catch (Exception e) {
            log.error("GPT image expand API error: {}", e.getMessage());
            throw new RuntimeException("图像扩展失败: " + e.getMessage());
        } finally {
            if (imageFile != null && imageFile.exists()) {
                FileUtil.del(imageFile);
            }
            if (maskFile != null && maskFile.exists()) {
                FileUtil.del(maskFile);
            }
        }
    }

    /**
     * 调用GPT图像局部改图API - 使用mask修改指定区域
     *
     * @param imageUrl 原始图片URL
     * @param maskUrl  遮罩图片URL（纯色选区+透明背景）
     * @param prompt   编辑提示词
     * @param model    使用的模型名称
     * @return 编辑后的图片URL或Base64数据
     */
    public String inpaintImage(String imageUrl, String maskUrl, String prompt, String model) {
        File imageFile = null;
        try {
            // 从URL下载图片到临时文件
            imageFile = downloadUrlToFile(imageUrl, "gpt_inpaint_");

            // 添加预制提示词，确保AI模型理解是局部修改
            String fullPrompt = "请完成对MASK遮罩Alpha像素的操作：" + prompt + "。不能改变选区以外任意地方的像素，保持原图的风格和内容连贯性。";

            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveApiKey = getApiKeyBySizeAndModel(null, model);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("image", imageFile)
                    .form("mask", maskUrl)
                    .form("model", model)
                    .form("prompt", fullPrompt)
                    .form("input_fidelity", "high")
                    .timeout(10 * 60 * 1000);

            HttpResponse response = request.execute();
            String body = response.body();
            log.info("GPT inpaint API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/png;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT inpaint API unexpected response: {}", body);
                throw new RuntimeException("局部改图失败，API返回异常");
            } else {
                log.error("GPT inpaint API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("局部改图失败: " + body);
            }
        } catch (Exception e) {
            log.error("GPT inpaint API error: {}", e.getMessage());
            throw new RuntimeException("局部改图失败: " + e.getMessage());
        } finally {
            if (imageFile != null && imageFile.exists()) {
                FileUtil.del(imageFile);
            }
        }
    }

    /**
     * 调用GPT图像抠图API - 移除背景
     *
     * @param file   上传的图片文件
     * @param prompt 抠图提示词
     * @param model  使用的模型名称
     * @return 抠图后的图片URL或Base64数据
     */
    public String mattingImage(MultipartFile file, String prompt, String model) {
        File tempFile = null;
        try {
            // 将MultipartFile转为临时文件
            tempFile = File.createTempFile("gpt_matting_", "_" + file.getOriginalFilename());
            file.transferTo(tempFile);

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", tempFile)
                    .form("model", model)
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            HttpResponse response = request.execute();
            String body = response.body();
            log.info("GPT matting API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/png;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT matting API unexpected response: {}", body);
                throw new RuntimeException("图像抠图失败，API返回异常");
            } else {
                log.error("GPT matting API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("图像抠图失败: " + body);
            }
        } catch (IOException e) {
            log.error("GPT matting API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                FileUtil.del(tempFile);
            }
        }
    }

    /**
     * 调用GPT图像修复API - 老照片修复
     *
     * @param file   上传的图片文件
     * @param prompt 修复提示词
     * @param model  使用的模型名称
     * @return 修复后的图片URL或Base64数据
     */
    public String restoreImage(MultipartFile file, String prompt, String model) {
        File tempFile = null;
        try {
            // 将MultipartFile转为临时文件
            tempFile = File.createTempFile("gpt_restore_", "_" + file.getOriginalFilename());
            file.transferTo(tempFile);

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", tempFile)
                    .form("model", model)
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            HttpResponse response = request.execute();
            String body = response.body();
            log.info("GPT restore API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/jpeg;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT restore API unexpected response: {}", body);
                throw new RuntimeException("老照片修复失败，API返回异常");
            } else {
                log.error("GPT restore API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("老照片修复失败: " + body);
            }
        } catch (IOException e) {
            log.error("GPT restore API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                FileUtil.del(tempFile);
            }
        }
    }

    /**
     * 从URL下载文件到临时文件
     */
    private File downloadUrlToFile(String url, String prefix) throws IOException {
        // 从URL中提取文件扩展名
        String extension = ".png";
        int lastDot = url.lastIndexOf('.');
        int queryIndex = url.indexOf('?', lastDot);
        if (lastDot > 0) {
            if (queryIndex > lastDot) {
                extension = url.substring(lastDot, queryIndex);
            } else if (queryIndex == -1) {
                extension = url.substring(lastDot);
            }
        }
        if (extension.length() > 5) {
            extension = extension.substring(0, 5);
        }

        File tempFile = File.createTempFile(prefix, extension);

        int maxRetries = 3;
        Exception lastException = null;

        for (int i = 0; i < maxRetries; i++) {
            try {
                HttpRequest.get(url)
                        .header("Referer", "https://" + cdnDomain + "/")
                        .timeout(60000)
                        .execute()
                        .writeBody(tempFile);

                if (tempFile.length() > 0) {
                    log.info("Downloaded file from {}, size: {} bytes", url, tempFile.length());
                    return tempFile;
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("Download attempt {} failed: {}", i + 1, e.getMessage());
            }
            if (i < maxRetries - 1) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ignored) {}
            }
        }

        throw new IOException("无法下载文件: " + url + (lastException != null ? ", " + lastException.getMessage() : ""));
    }

    /**
     * 调用GPT图像编辑API - 支持多图上传
     *
     * @param files  上传的图片文件列表（最多5张）
     * @param prompt 编辑提示词
     * @param size   图片尺寸
     * @param modelParam 使用的模型（可选）
     * @return 生成的图片URL或Base64数据
     */
    public String editImage(List<MultipartFile> files, String prompt, String size, String modelParam) {
        List<File> tempFiles = new ArrayList<>();
        try {
            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveModel = getEffectiveModel(modelParam, size);
            String effectiveApiKey = getApiKeyBySizeAndModel(size, modelParam);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("model", effectiveModel)
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            // 添加多张图片
            for (MultipartFile file : files) {
                File tempFile = File.createTempFile("gpt_upload_", "_" + file.getOriginalFilename());
                file.transferTo(tempFile);
                tempFiles.add(tempFile);
                request.form("image", tempFile);
            }

            // 添加尺寸参数（可选）
            if (size != null && !size.isEmpty()) {
                request.form("size", size);
            }

            HttpResponse response = request.execute();
            String body = response.body();
            log.info("GPT image edit API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/png;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT image edit API unexpected response: {}", body);
                throw new RuntimeException("图像编辑失败，API返回异常");
            } else {
                log.error("GPT image edit API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("图像编辑失败: " + body);
            }
        } catch (IOException e) {
            log.error("GPT image edit API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            for (File tempFile : tempFiles) {
                if (tempFile != null && tempFile.exists()) {
                    FileUtil.del(tempFile);
                }
            }
        }
    }

    /**
     * 调用GPT图像生成API - 纯文字生成图片
     *
     * @param prompt 生成提示词
     * @param size   图片尺寸（如：1024x1024, 2160x3840）
     * @param modelParam 使用的模型（可选）
     * @return 生成的图片URL或Base64数据
     */
    public String generateImage(String prompt, String size, String modelParam) {
        try {
            String fullUrl = apiUrl + "/v1/images/generations";
            String effectiveModel = getEffectiveModel(modelParam, size);
            String effectiveApiKey = getApiKeyBySizeAndModel(size, modelParam);

            JSONObject requestBody = new JSONObject();
            requestBody.put("model", effectiveModel);
            requestBody.put("prompt", prompt);
            requestBody.put("n", 1);
            if (size != null && !size.isEmpty()) {
                requestBody.put("size", size);
            }
            requestBody.put("output_format", "jpeg");

            HttpResponse response = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody.toJSONString())
                    .timeout(10 * 60 * 1000)
                    .execute();

            String body = response.body();
            log.info("GPT image generation API response status: {}", response.getStatus());

            if (response.isOk()) {
                JSONObject json = JSON.parseObject(body);
                if (json.containsKey("data")) {
                    JSONObject imageData = json.getJSONArray("data").getJSONObject(0);
                    if (imageData.containsKey("url")) {
                        return imageData.getString("url");
                    } else if (imageData.containsKey("b64_json")) {
                        return "data:image/jpeg;base64," + imageData.getString("b64_json");
                    }
                }
                log.error("GPT image generation API unexpected response: {}", body);
                throw new RuntimeException("图像生成失败，API返回异常");
            } else {
                log.error("GPT image generation API error: status={}, body={}", response.getStatus(), body);
                throw new RuntimeException("图像生成失败: " + body);
            }
        } catch (Exception e) {
            log.error("GPT image generation API error: {}", e.getMessage());
            throw new RuntimeException("图像生成失败: " + e.getMessage());
        }
    }
}
