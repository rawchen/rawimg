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
}
