package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.entity.CardKey;
import com.rawchen.entity.Order;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.CardKeyService;
import com.rawchen.service.OrderService;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 订单管理Controller
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminOrderController {

    private final OrderService orderService;
    private final UserService userService;
    private final CardKeyService cardKeyService;

    @GetMapping("/orders")
    public R<Map<String, Object>> getAllOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String orderType,
            @RequestParam(required = false) Long userId) {

        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();

        if (status != null && !status.isEmpty()) {
            wrapper.eq(Order::getStatus, Order.OrderStatus.valueOf(status));
        }
        if (orderType != null && !orderType.isEmpty()) {
            wrapper.eq(Order::getOrderType, Order.OrderType.valueOf(orderType));
        }
        if (userId != null) {
            wrapper.eq(Order::getUserId, userId);
        }

        wrapper.orderByDesc(Order::getCreateTime);

        IPage<Order> orders = orderService.page(new Page<>(page, size), wrapper);

        Map<String, Object> result = new HashMap<>();
        result.put("content", orders.getRecords().stream().map(this::toOrderResponse).collect(Collectors.toList()));
        result.put("totalPages", orders.getPages());
        result.put("totalElements", orders.getTotal());
        result.put("currentPage", page);

        return R.ok(result);
    }

    @GetMapping("/orders/{id}")
    public R<Map<String, Object>> getOrderById(@PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        return R.ok(toOrderResponse(order));
    }

    @GetMapping("/orders/orderNo/{orderNo}")
    public R<Map<String, Object>> getOrderByOrderNo(@PathVariable String orderNo) {
        Order order = orderService.getOrderByOrderNo(orderNo);
        return R.ok(toOrderResponse(order));
    }

    @PutMapping("/orders/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Map<String, Object>> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam Order.OrderStatus status) {

        Order order = orderService.getById(id);
        if (order == null) {
            return R.notFound("订单不存在");
        }

        order.setStatus(status);
        orderService.updateById(order);

        return R.ok(toOrderResponse(order));
    }

    private Map<String, Object> toOrderResponse(Order order) {
        SysUser user = userService.getById(order.getUserId());

        Map<String, Object> result = new HashMap<>();
        result.put("id", order.getId());
        result.put("orderNo", order.getOrderNo());
        result.put("userId", order.getUserId());
        result.put("username", user != null ? user.getUsername() : "");
        result.put("email", user != null ? user.getEmail() : "");
        result.put("amount", order.getAmount());
        result.put("status", order.getStatus().name());
        result.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "");
        result.put("orderType", order.getOrderType().name());
        result.put("vipDays", order.getVipDays() != null ? order.getVipDays() : 0);
        result.put("points", order.getPoints() != null ? order.getPoints() : 0);
        result.put("transactionId", order.getTransactionId() != null ? order.getTransactionId() : "");
        result.put("payTime", order.getPayTime() != null ? order.getPayTime().toString() : "");
        result.put("createTime", order.getCreateTime() != null ? order.getCreateTime().toString() : "");
        result.put("cardKeyId", order.getCardKeyId());

        // 获取卡密信息
        if (order.getCardKeyId() != null) {
            CardKey cardKey = cardKeyService.getById(order.getCardKeyId());
            if (cardKey != null) {
                result.put("cardCode", cardKey.getCardCode());
                result.put("cardType", cardKey.getCardType().getName());
            }
        }

        return result;
    }
}
