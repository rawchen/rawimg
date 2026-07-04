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

    @Value("${gpt.image.model}")
    private String model;

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
     * @return 扩展后的图片URL或Base64数据
     */
    public String expandImage(String imageUrl, String maskUrl, String size) {
        // 固定提示词，不暴露给前端
        String prompt = "自然地扩展图像边界，保持风格和内容的连贯性，生成与原图风格一致的背景内容";

        File imageFile = null;
        File maskFile = null;
        try {
            // 从URL下载图片到临时文件
            imageFile = downloadUrlToFile(imageUrl, "gpt_image_");
//            maskFile = downloadUrlToFile(maskUrl, "gpt_mask_");

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", imageFile)
                    .form("mask", maskUrl)
                    .form("model", model)
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
     * 从URL下载文件到临时文件
     */
    private File downloadUrlToFile(String url, String prefix) throws IOException {
        File tempFile = File.createTempFile(prefix, ".jpg");
        HttpRequest.get(url)
                .timeout(60000)
                .execute()
                .writeBody(tempFile);
        return tempFile;
    }

    /**
     * 调用GPT图像编辑API - 支持多图上传
     *
     * @param files  上传的图片文件列表（最多5张）
     * @param prompt 编辑提示词
     * @return 生成的图片URL或Base64数据
     */
    public String editImage(List<MultipartFile> files, String prompt, String size) {
        List<File> tempFiles = new ArrayList<>();
        try {
            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("model", model)
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
     * @return 生成的图片URL或Base64数据
     */
    public String generateImage(String prompt, String size) {
        try {
            String fullUrl = apiUrl + "/v1/images/generations";

            JSONObject requestBody = new JSONObject();
            requestBody.put("model", model);
            requestBody.put("prompt", prompt);
            requestBody.put("n", 1);
            if (size != null && !size.isEmpty()) {
                requestBody.put("size", size);
            }
            requestBody.put("output_format", "jpeg");

            HttpResponse response = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
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
