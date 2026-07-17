package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.entity.InspirationTemplate;
import com.rawchen.service.InspirationTemplateService;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 图像创作控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-create")
@RequiredArgsConstructor
public class ImageCreateController {

    private final GptUtil gptUtil;
    private final InspirationTemplateService inspirationTemplateService;

    /**
     * 图像创作接口 - 自动判断使用生成还是编辑
     *
     * @param files  上传的图片文件列表（可选，最多5张）
     * @param prompt 创作提示词
     * @param size   图片尺寸
     * @return 生成的图片URL
     */
    @PostMapping("/create")
    public R<ImageCreateResponse> createImage(
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam("prompt") String prompt,
            @RequestParam(value = "size", defaultValue = "1024x1024") String size) {

        if (prompt == null || prompt.trim().isEmpty()) {
            return R.badRequest("请输入描述内容");
        }

        // 验证文件数量
        if (files != null && files.size() > 5) {
            return R.badRequest("最多上传5张参考图片");
        }

        try {
            String resultUrl;
            if (files == null || files.isEmpty()) {
                // 没有图片，使用纯文字生成
                log.info("Creating image from text prompt: {}", prompt);
                resultUrl = gptUtil.generateImage(prompt, size, null);
            } else {
                // 有图片，使用图片编辑
                log.info("Creating image with {} reference images", files.size());
                resultUrl = gptUtil.editImage(files, prompt, size, null);
            }

            ImageCreateResponse response = new ImageCreateResponse();
            response.setCreatedUrl(resultUrl);
            response.setPrompt(prompt);
            response.setSize(size);
            return R.ok(response);
        } catch (Exception e) {
            log.error("Image creation failed: {}", e.getMessage());
            return R.fail("图像创作失败: " + e.getMessage());
        }
    }

    /**
     * 获取灵感模板列表
     *
     * @param category 分类（可选）
     * @return 模板列表
     */
    @GetMapping("/templates")
    public R<List<InspirationTemplate>> getTemplates(
            @RequestParam(value = "category", required = false) String category) {
        List<InspirationTemplate> templates = inspirationTemplateService.getTemplates(category);
        return R.ok(templates);
    }

    /**
     * 随机获取灵感模板（用于首页滚动展示）
     *
     * @param count 数量（默认10个）
     * @return 随机模板列表
     */
    @GetMapping("/templates/random")
    public R<List<InspirationTemplate>> getRandomTemplates(
            @RequestParam(value = "count", defaultValue = "10") Integer count) {
        List<InspirationTemplate> templates = inspirationTemplateService.getRandomTemplates(count);
        return R.ok(templates);
    }

    /**
     * 获取所有分类
     *
     * @return 分类列表
     */
    @GetMapping("/categories")
    public R<List<String>> getCategories() {
        List<String> categories = inspirationTemplateService.getCategories();
        return R.ok(categories);
    }

    /**
     * 图像创作响应
     */
    @lombok.Data
    public static class ImageCreateResponse {
        private String createdUrl;
        private String prompt;
        private String size;
    }
}
