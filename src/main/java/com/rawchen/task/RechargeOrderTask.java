package com.rawchen.task;

import com.rawchen.service.RechargeOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 充值订单定时任务
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RechargeOrderTask {

    private final RechargeOrderService rechargeOrderService;

    /**
     * 每分钟更新过期订单
     */
    @Scheduled(cron = "0 * * * * ?")
    public void updateExpiredOrders() {
        try {
            rechargeOrderService.updateExpiredOrders();
            log.debug("更新过期订单完成");
        } catch (Exception e) {
            log.error("更新过期订单失败", e);
        }
    }
}
