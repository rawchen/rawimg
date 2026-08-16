package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.RechargeOrderDTO;
import com.rawchen.entity.RechargeOrder;

import java.math.BigDecimal;

/**
 * 充值订单服务接口
 */
public interface RechargeOrderService extends IService<RechargeOrder> {

    /**
     * 创建充值订单
     */
    RechargeOrder createOrder(Long userId, BigDecimal amount, String paymentMethod);

    /**
     * 处理支付回调
     */
    void handlePaymentCallback(String orderNo, String transactionId, BigDecimal paidAmount);

    /**
     * 查询订单状态
     */
    RechargeOrder queryOrderStatus(String orderNo);

    /**
     * 获取用户订单列表
     */
    IPage<RechargeOrderDTO> getUserOrderPage(Long userId, String status, String searchOrderNo, Integer page, Integer size);

    /**
     * 更新过期订单
     */
    void updateExpiredOrders();
}
