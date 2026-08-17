package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.dto.RechargeOrderDTO;
import com.rawchen.entity.R;
import com.rawchen.entity.RechargeOrder;
import com.rawchen.entity.RechargePackage;
import com.rawchen.entity.SysUser;
import com.rawchen.service.RechargeOrderService;
import com.rawchen.service.RechargePackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 充值控制器
 */
@RestController
@RequestMapping("/api/recharge")
@RequiredArgsConstructor
public class RechargeController {

    private final RechargePackageService rechargePackageService;
    private final RechargeOrderService rechargeOrderService;

    /**
     * 获取充值套餐列表
     */
    @GetMapping("/packages")
    public R<List<RechargePackage>> getPackages() {
        List<RechargePackage> packages = rechargePackageService.getEnabledPackages();
        return R.ok(packages);
    }

    /**
     * 创建充值订单
     */
    @PostMapping("/create")
    public R<Map<String, Object>> createOrder(
            @RequestParam BigDecimal amount,
            @RequestParam String paymentMethod,
            @AuthenticationPrincipal SysUser user) {

        RechargeOrder order = rechargeOrderService.createOrder(user.getId(), amount, paymentMethod);

        Map<String, Object> result = new HashMap<>();
        result.put("orderNo", order.getOrderNo());
        result.put("qrCodeUrl", order.getQrCodeUrl());
        result.put("payUrl", order.getPayUrl());
        result.put("amount", order.getAmount());
        result.put("paidAmount", order.getPaidAmount());
        result.put("creditAmount", order.getCreditAmount());
        result.put("expireTime", order.getExpireTime());

        return R.ok(result);
    }

    /**
     * 查询订单状态
     */
    @GetMapping("/order/{orderNo}")
    public R<RechargeOrder> queryOrder(
            @PathVariable String orderNo,
            @AuthenticationPrincipal SysUser user) {

        RechargeOrder order = rechargeOrderService.queryOrderStatus(orderNo);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return R.fail("订单不存在");
        }
        return R.ok(order);
    }

    /**
     * 获取用户订单列表
     */
    @GetMapping("/orders")
    public R<IPage<RechargeOrderDTO>> getOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String orderNo,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @AuthenticationPrincipal SysUser user) {

        IPage<RechargeOrderDTO> orderPage = rechargeOrderService.getUserOrderPage(
                user.getId(), status, orderNo, page, size);
        return R.ok(orderPage);
    }

    /**
     * 支付回调接口
     */
    @PostMapping("/notify")
    public String paymentNotify(HttpServletRequest request) {
        try {
            // TODO: 验证签名，处理回调
            String orderNo = request.getParameter("outTradeNo");
            String transactionId = request.getParameter("payNo");
            String money = request.getParameter("money");

            rechargeOrderService.handlePaymentCallback(
                    orderNo,
                    transactionId,
                    new BigDecimal(money)
            );

            return "SUCCESS";
        } catch (Exception e) {
            return "FAIL";
        }
    }
}
