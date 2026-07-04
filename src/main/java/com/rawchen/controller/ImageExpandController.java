package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.service.OssUploadService;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 图像扩展控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-expand")
@RequiredArgsConstructor
public class ImageExpandController {

    private final GptUtil gptUtil;
    private final OssUploadService ossUploadService;

    /**
     * 图像扩展接口
     *
     * @param imageUrl 合成图片URL（白色背景+原图按位置摆放，尺寸与mask一致）
     * @param maskUrl  遮罩图片URL（原图部分黑色，扩展部分白色，尺寸与imageUrl图片一致）
     * @param size     扩展后的图片尺寸
     * @return 扩展后的图片URL
     */
    @PostMapping("/expand")
    public R<ImageExpandResponse> expandImage(
            @RequestParam("imageUrl") String imageUrl,
            @RequestParam("maskUrl") String maskUrl,
            @RequestParam("size") String size) {

        if (imageUrl == null || imageUrl.isEmpty()) {
            return R.badRequest("请上传合成图片");
        }

        if (maskUrl == null || maskUrl.isEmpty()) {
            return R.badRequest("请上传遮罩图片");
        }

        try {
            // 调用GPT扩展API，传入mask URL
            String gptResultUrl = gptUtil.expandImage(imageUrl, maskUrl, size);
            log.info("GPT expand result URL: {}", gptResultUrl);

            // 将GPT返回的图片URL上传到OSS
            String ossResultUrl = ossUploadService.uploadFromUrlWithFolder(gptResultUrl, "expand-result/");
            log.info("Result image uploaded to OSS: {}", ossResultUrl);

            ImageExpandResponse response = new ImageExpandResponse();
            response.setOriginalFilename(imageUrl.substring(imageUrl.lastIndexOf('/') + 1));
            response.setExpandedUrl(ossResultUrl);
            response.setSize(size);
            return R.ok(response);
        } catch (Exception e) {
            log.error("Image expand failed: {}", e.getMessage());
            return R.fail("图像扩展失败: " + e.getMessage());
        }
    }

    /**
     * 图像扩展响应
     */
    @lombok.Data
    public static class ImageExpandResponse {
        private String originalFilename;
        private String expandedUrl;
        private String size;
    }
}
