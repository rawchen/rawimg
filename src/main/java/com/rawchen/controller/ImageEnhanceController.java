package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 图像增强控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-enhance")
@RequiredArgsConstructor
public class ImageEnhanceController {

    private final GptUtil gptUtil;

    /**
     * 图像增强接口
     *
     * @param file   上传的图片文件
     * @param category 图片类别（portrait/object/scenery/pets/text）
     * @param prompt 自定义提示词（可选）
     * @return 增强后的图片URL
     */
    @PostMapping("/enhance")
    public R<ImageEnhanceResponse> enhanceImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "general") String category,
            @RequestParam(value = "prompt", required = false) String prompt) {

        if (file.isEmpty()) {
            return R.badRequest("请上传图片文件");
        }

        // 验证文件类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return R.badRequest("只支持图片文件");
        }

        // 构建增强提示词
        String enhancePrompt = buildEnhancePrompt(category, prompt);
        log.info("Enhancing image with prompt: {}", enhancePrompt);

        try {
            String resultUrl = gptUtil.enhanceImage(file, enhancePrompt);
            ImageEnhanceResponse response = new ImageEnhanceResponse();
            response.setOriginalFilename(file.getOriginalFilename());
            response.setEnhancedUrl(resultUrl);
            response.setCategory(category);
            return R.ok(response);
        } catch (Exception e) {
            log.error("Image enhancement failed: {}", e.getMessage());
            return R.fail("图像增强失败: " + e.getMessage());
        }
    }

    /**
     * 根据类别构建增强提示词
     */
    private String buildEnhancePrompt(String category, String customPrompt) {
        // 如果提供了自定义提示词，直接使用
        if (customPrompt != null && !customPrompt.trim().isEmpty()) {
            return customPrompt;
        }

        // 根据类别使用不同的增强提示词
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
     * 图像增强响应
     */
    @lombok.Data
    public static class ImageEnhanceResponse {
        private String originalFilename;
        private String enhancedUrl;
        private String category;
    }
}
