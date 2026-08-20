package com.rawchen.controller;

import com.rawchen.entity.ModelPrice;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.ConsumeLogService;
import com.rawchen.service.ModelPriceService;
import com.rawchen.service.UserBalanceService;
import com.rawchen.util.GptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

/**
 * 图像物体移除控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/image-remove")
@RequiredArgsConstructor
public class ImageRemoveController {

    private final GptUtil gptUtil;
    private final UserBalanceService userBalanceService;
    private final ModelPriceService modelPriceService;
    private final ConsumeLogService consumeLogService;

    /**
     * 物体移除接口
     *
     * @param file     上传的图片文件
     * @param category 移除类别（people/text/watermark/wrinkles/glare）
     * @param model    使用的模型（默认 gpt-image-2）
     * @param user     当前登录用户
     * @return 移除后的图片URL
     */
    @PostMapping("/remove")
    public R<ImageRemoveResponse> removeObjects(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "people") String category,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @AuthenticationPrincipal SysUser user) {

        if (file.isEmpty()) {
            return R.badRequest("请上传图片文件");
        }

        // 验证文件类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return R.badRequest("只支持图片文件");
        }

        // 获取模型价格并检查余额
        BigDecimal cost = modelPriceService.getPrice(model);
        if (cost.compareTo(BigDecimal.ZERO) == 0) {
            return R.badRequest("未配置该模型的价格: " + model);
        }

        if (!userBalanceService.checkBalance(user.getId(), cost)) {
            return R.forbidden("余额不足，当前需要 ¥" + cost + "，请先充值");
        }

        // 扣费
        boolean deducted = userBalanceService.deduct(user.getId(), cost);
        if (!deducted) {
            return R.forbidden("扣费失败，请稍后重试");
        }

        // 构建移除提示词
        String removePrompt = buildRemovePrompt(category);
        log.info("Removing objects from image with prompt: {}, cost: {}", removePrompt, cost);

        try {
            String resultUrl = gptUtil.enhanceImage(file, removePrompt);

            // 创建消费日志
            ModelPrice price = modelPriceService.getByModelCode(model);
            consumeLogService.createLog(user.getId(), null, "remove", model,
                    price != null ? price.getModelName() : model, null, cost);

            ImageRemoveResponse response = new ImageRemoveResponse();
            response.setOriginalFilename(file.getOriginalFilename());
            response.setRemovedUrl(resultUrl);
            response.setCategory(category);
            response.setCost(cost);
            return R.ok(response);
        } catch (Exception e) {
            log.error("Image remove failed: {}", e.getMessage());
            // 失败时退还余额
            userBalanceService.recharge(user.getId(), cost);
            return R.fail("物体移除失败: " + e.getMessage());
        }
    }

    /**
     * 根据类别构建移除提示词
     */
    private String buildRemovePrompt(String category) {
        switch (category) {
            case "people":
                return "移除这张照片中主体以外的所有人物，保持背景完整自然，用周围的景物智能填充空白区域";
            case "text":
                return "移除这张照片中的所有文字，保持图片原本的背景和内容，用周围的景物智能填充空白区域";
            case "watermark":
                return "移除这张照片中的水印标志，保持图片原本的内容和质量，用周围的景物智能填充空白区域";
            case "wrinkles":
                return "移除这张照片中的衣物或布料上的皱褶，保持布料的纹理自然，使照片更加平滑美观";
            case "glare":
                return "移除这张照片中的眩光和反光，保持图片原本的色彩和细节，使照片更加清晰";
            default:
                return "移除这张照片中不需要的物体，保持背景完整自然，用周围的景物智能填充空白区域";
        }
    }

    /**
     * 图像移除响应
     */
    @lombok.Data
    public static class ImageRemoveResponse {
        private String originalFilename;
        private String removedUrl;
        private String category;
        private BigDecimal cost;
    }
}
