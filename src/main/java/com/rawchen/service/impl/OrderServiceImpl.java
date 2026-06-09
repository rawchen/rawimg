package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.Order;
import com.rawchen.entity.SysUser;
import com.rawchen.mapper.OrderMapper;
import com.rawchen.service.ConfigService;
import com.rawchen.service.OrderService;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 订单服务实现类
 */
@Service
@RequiredArgsConstructor
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {

    private final UserService userService;
    private final ConfigService configService;

    @Override
    @Transactional
    public Order createVipOrder(Long userId, int days, Order.PaymentMethod paymentMethod) {
        SysUser user = userService.getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        BigDecimal price;
        if (days == 30) {
            price = new BigDecimal(configService.getConfigValue("vip_monthly_price", "29.99"));
        } else if (days == 365) {
            price = new BigDecimal(configService.getConfigValue("vip_yearly_price", "299.99"));
        } else {
            price = new BigDecimal("9.99").multiply(BigDecimal.valueOf(days));
        }

        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setAmount(price);
        order.setPaymentMethod(paymentMethod);
        order.setOrderType(Order.OrderType.VIP);
        order.setVipDays(days);
        order.setStatus(Order.OrderStatus.PENDING);

        save(order);
        return order;
    }

    @Override
    @Transactional
    public Order createPointsOrder(Long userId, int points, Order.PaymentMethod paymentMethod) {
        SysUser user = userService.getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        int rate = configService.getConfigIntValue("points_rate", 100);
        BigDecimal price = new BigDecimal(points).divide(new BigDecimal(rate), 2, RoundingMode.HALF_UP);

        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setAmount(price);
        order.setPaymentMethod(paymentMethod);
        order.setOrderType(Order.OrderType.POINTS);
        order.setPoints(points);
        order.setStatus(Order.OrderStatus.PENDING);

        save(order);
        return order;
    }

    @Override
    @Transactional
    public Order updateOrderStatus(String orderNo, String transactionId) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getOrderNo, orderNo);
        Order order = getOne(wrapper);
        if (order == null) {
            throw new RuntimeException("Order not found");
        }

        order.setStatus(Order.OrderStatus.PAID);
        order.setTransactionId(transactionId);
        order.setPayTime(LocalDateTime.now());

        // Process the order based on type
        if (order.getOrderType() == Order.OrderType.VIP) {
            userService.updateVipStatus(order.getUserId(), order.getVipDays());
        } else if (order.getOrderType() == Order.OrderType.POINTS) {
            userService.addPoints(order.getUserId(), order.getPoints());
        }

        updateById(order);
        return order;
    }

    @Override
    public Order getOrderById(Long id) {
        Order order = getById(id);
        if (order == null) {
            throw new RuntimeException("Order not found");
        }
        return order;
    }

    @Override
    public Order getOrderByOrderNo(String orderNo) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getOrderNo, orderNo);
        Order order = getOne(wrapper);
        if (order == null) {
            throw new RuntimeException("Order not found");
        }
        return order;
    }

    @Override
    public IPage<Order> getOrdersByUser(Long userId, int page, int size) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getUserId, userId)
               .orderByDesc(Order::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    private String generateOrderNo() {
        return "LL" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
