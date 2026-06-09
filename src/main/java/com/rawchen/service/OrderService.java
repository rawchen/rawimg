package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.Order;

/**
 * 订单服务接口
 */
public interface OrderService extends IService<Order> {

    /**
     * 创建VIP订单
     */
    Order createVipOrder(Long userId, int days, Order.PaymentMethod paymentMethod);

    /**
     * 创建积分订单
     */
    Order createPointsOrder(Long userId, int points, Order.PaymentMethod paymentMethod);

    /**
     * 更新订单状态（支付成功）
     */
    Order updateOrderStatus(String orderNo, String transactionId);

    /**
     * 根据ID获取订单
     */
    Order getOrderById(Long id);

    /**
     * 根据订单号获取订单
     */
    Order getOrderByOrderNo(String orderNo);

    /**
     * 获取用户的订单列表（分页）
     */
    IPage<Order> getOrdersByUser(Long userId, int page, int size);
}
