package com.rawchen.service;

import com.rawchen.entity.R;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * 图片异步任务「被线程池拒绝」时的兜底处理
 * <p>
 * {@code imageTaskExecutor} 队列满时会以 {@code AbortPolicy} 立即拒绝，
 * 任务不会真正开始执行。此时必须同步做三件事，否则会出现：
 * <ul>
 *   <li>任务记录永远停在 {@code pending}，前端轮询到超时；</li>
 *   <li>消费日志一直挂着，账单对不上；</li>
 *   <li>用户已经被扣费，却什么都没拿到。</li>
 * </ul>
 * 所以：任务置为失败 + 消费日志置为失败 + 退还本次费用。
 *
 * @author RawChen
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImageTaskRejectHandler {

    /**
     * 队列打满时返回给前端的提示
     */
    public static final String BUSY_MESSAGE = "当前生成任务过多，系统繁忙，请稍后重试（本次费用已退还）";

    private final ImageTaskService imageTaskService;
    private final ConsumeLogService consumeLogService;
    private final UserBalanceService userBalanceService;

    /**
     * 处理被线程池拒绝的任务提交
     *
     * @param taskId 任务ID
     * @param userId 用户ID
     * @param cost   本次已扣费用（为空或非正数时不退还）
     * @return 可直接返回给前端的失败响应
     */
    public <T> R<T> reject(String taskId, Long userId, BigDecimal cost) {
        log.warn("Image task {} rejected: imageTaskExecutor queue is full", taskId);

        try {
            imageTaskService.updateError(taskId, BUSY_MESSAGE, 0L);
        } catch (Exception e) {
            log.error("Failed to mark task {} as error: {}", taskId, e.getMessage(), e);
        }

        try {
            consumeLogService.updateFailed(taskId, BUSY_MESSAGE);
        } catch (Exception e) {
            log.error("Failed to mark consume log of task {} as failed: {}", taskId, e.getMessage(), e);
        }

        if (userId != null && cost != null && cost.compareTo(BigDecimal.ZERO) > 0) {
            try {
                userBalanceService.recharge(userId, cost);
                log.info("Refunded {} for rejected task {}, userId={}", cost, taskId, userId);
            } catch (Exception e) {
                log.error("Failed to refund {} for rejected task {}, userId={}: {}", cost, taskId, userId, e.getMessage(), e);
            }
        }

        return R.fail(BUSY_MESSAGE);
    }
}
