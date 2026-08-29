package com.rawchen.controller;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.ConsumeLog;
import com.rawchen.entity.ImageTask;
import com.rawchen.entity.ModelPrice;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AsyncImageTaskExecutor;
import com.rawchen.service.ConsumeLogService;
import com.rawchen.service.ImageTaskService;
import com.rawchen.service.ModelPriceService;
import com.rawchen.service.UserBalanceService;
import com.rawchen.util.GptUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * 音乐封面异步控制器
 *
 * @author RawChen
 */
@Slf4j
@RestController
@RequestMapping("/api/music-cover")
@RequiredArgsConstructor
public class MusicCoverAsyncController {

    private final ImageTaskService imageTaskService;
    private final AsyncImageTaskExecutor asyncImageTaskExecutor;
    private final UserBalanceService userBalanceService;
    private final ModelPriceService modelPriceService;
    private final ConsumeLogService consumeLogService;

    /**
     * 异步创建音乐封面
     *
     * @param songId   歌曲ID
     * @param songName 歌曲名称
     * @param lyric    歌词
     * @param style    风格（auto/anime/watercolor/realistic/abstract/minimalist）
     * @param model    使用的模型（可选，默认gpt-image-2）
     * @param n        生成图片数量（可选，默认1，范围1-10）
     * @param user     当前登录用户
     * @return 任务ID
     */
    @PostMapping("/create_async")
    public R<CreateAsyncResponse> createMusicCoverAsync(
            @RequestParam("songId") String songId,
            @RequestParam("songName") String songName,
            @RequestParam("lyric") String lyric,
            @RequestParam(value = "style", defaultValue = "auto") String style,
            @RequestParam(value = "model", defaultValue = "gpt-image-2") String model,
            @RequestParam(value = "n", required = false, defaultValue = "1") Integer n,
            @AuthenticationPrincipal SysUser user) {

        if (songName == null || songName.trim().isEmpty()) {
            return R.badRequest("歌曲名称不能为空");
        }

        // 验证n参数范围
        if (n != null && (n < 1 || n > 10)) {
            return R.badRequest("生成图片数量必须在1-10之间");
        }

        // 构建提示词
        String prompt = buildPrompt(songName, lyric, style);

        // 音乐封面固定为1024x1024
        String size = "1024x1024";

        // 根据模型获取价格
        String effectiveModelCode = GptUtil.getEffectiveModelCode(model, size);

        // 获取模型价格并检查余额
        BigDecimal baseCost = modelPriceService.getPrice(effectiveModelCode);
        if (baseCost.compareTo(BigDecimal.ZERO) == 0) {
            return R.badRequest("未配置该模型的价格: " + model);
        }

        // 计算费用（按次消费，不乘以生成数量n）
        BigDecimal cost = baseCost;

        if (!userBalanceService.checkBalance(user.getId(), cost)) {
            return R.forbidden("余额不足，当前需要 ¥" + cost + "，请先充值");
        }

        // 扣费
        boolean deducted = userBalanceService.deduct(user.getId(), cost);
        if (!deducted) {
            return R.forbidden("扣费失败，请稍后重试");
        }

        // 生成任务ID
        String taskId = UUID.randomUUID().toString();

        // 创建任务记录
        ImageTask task = new ImageTask();
        task.setTaskId(taskId);
        task.setUserId(user.getId());
        task.setTaskType("music_cover");
        task.setStatus("pending");
        task.setPrompt(prompt);
        task.setSize(size);
        task.setModel(model);
        task.setSongId(songId);
        task.setSongName(songName);
        imageTaskService.save(task);

        // 创建消费日志
        ModelPrice price = modelPriceService.getByModelCode(effectiveModelCode);
        consumeLogService.createLog(user.getId(), taskId, "music_cover", effectiveModelCode,
                price != null ? price.getModelName() : model, size, cost);

        // 异步执行任务
        asyncImageTaskExecutor.executeMusicCoverTask(taskId, prompt, size, model, n);

        CreateAsyncResponse response = new CreateAsyncResponse();
        response.setTaskId(taskId);
        response.setCost(cost);
        return R.ok(response);
    }

    /**
     * 构建音乐封面提示词
     */
    private String buildPrompt(String songName, String lyric, String style) {
        StringBuilder prompt = new StringBuilder();

        // 添加歌词（使用全部歌词）
        if (lyric != null && !lyric.trim().isEmpty()) {
            // 移除时间标签，如 [00:12.34]
            String cleanLyric = lyric.replaceAll("\\[.*?\\]", "").trim();
            prompt.append(cleanLyric).append("\n");
        }

        // 添加歌曲名和封面生成提示
        prompt.append("根据\"").append(songName).append("\"歌曲名及以上歌词生成对应的歌曲封面");

        // 添加风格提示
        if (style != null && !"auto".equals(style)) {
            String styleText = getStyleText(style);
            if (styleText != null) {
                prompt.append("，风格为：").append(styleText);
            }
        }

        prompt.append("，生成图上无需任何文字");

        return prompt.toString();
    }

    /**
     * 获取风格文本
     */
    private String getStyleText(String style) {
        switch (style) {
            case "anime":
                return "动漫风格";
            case "watercolor":
                return "水彩画风格";
            case "realistic":
                return "真实摄影风格";
            case "abstract":
                return "抽象艺术风格";
            case "minimalist":
                return "简约设计风格";
            default:
                return null;
        }
    }

    /**
     * 查询任务结果
     */
    @GetMapping("/result")
    public R<TaskResultResponse> getResult(@RequestParam("id") String id) {
        ImageTask task = imageTaskService.getByTaskId(id);
        if (task == null) {
            TaskResultResponse response = new TaskResultResponse();
            response.setStatus("not_found");
            return R.ok(response);
        }

        TaskResultResponse response = new TaskResultResponse();
        response.setStatus(task.getStatus());
        if ("done".equals(task.getStatus())) {
            response.setImageUrl(task.getResultImageUrl());
        } else if ("error".equals(task.getStatus())) {
            response.setMsg(task.getErrorMsg());
        }
        return R.ok(response);
    }

    /**
     * 获取用户的任务历史列表
     */
    @GetMapping("/history")
    public R<TaskHistoryPageResponse> getHistory(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "10") Integer size,
            @AuthenticationPrincipal SysUser user) {

        IPage<ImageTask> taskPage = imageTaskService.getUserTaskPage(user.getId(), page, size, "music_cover", null);

        TaskHistoryPageResponse response = new TaskHistoryPageResponse();
        response.setRecords(taskPage.getRecords());
        response.setTotal(taskPage.getTotal());
        response.setPages(taskPage.getPages());
        response.setCurrent(taskPage.getCurrent());
        response.setSize(taskPage.getSize());
        return R.ok(response);
    }

    /**
     * 创建异步任务响应
     */
    @Data
    public static class CreateAsyncResponse {
        private String taskId;
        private BigDecimal cost;
    }

    /**
     * 任务结果响应
     */
    @Data
    public static class TaskResultResponse {
        private String status;
        private String imageUrl;
        private String msg;
    }

    /**
     * 任务历史分页响应
     */
    @Data
    public static class TaskHistoryPageResponse {
        private List<ImageTask> records;
        private Long total;
        private Long pages;
        private Long current;
        private Long size;
    }
}
