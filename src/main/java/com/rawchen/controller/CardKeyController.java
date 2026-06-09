package com.rawchen.controller;

import com.rawchen.annotation.RateLimit;
import com.rawchen.entity.Order;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AccessLogService;
import com.rawchen.service.CardKeyService;
import com.rawchen.service.OrderService;
import com.rawchen.service.UserActionService;
import com.rawchen.util.IpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 用户端卡密兑换Controller
 */
@RestController
@RequestMapping("/api/card-keys")
@RequiredArgsConstructor
public class CardKeyController {

    private final CardKeyService cardKeyService;
    private final OrderService orderService;
    private final AccessLogService accessLogService;
    private final UserActionService userActionService;

    /**
     * 兑换卡密
     */
    @RateLimit(key = "card_redeem", time = 1, count = 1, message = "操作过于频繁，请稍后再试")
    @PostMapping("/redeem")
    public R<Map<String, Object>> redeemCardKey(
            @AuthenticationPrincipal SysUser user,
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest) {
        String cardCode = request.get("cardCode");

        if (user == null) {
            return R.unauthorized();
        }
        // 获取用户ID
        Long userId = user.getId();
        String ip = IpUtil.getClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        
        try {
            Order order = cardKeyService.redeemCardKey(userId, cardCode);

            // 记录兑换日志
            userActionService.recordCardRedeem(userId, ip, userAgent);

            Map<String, Object> result = new HashMap<>();
            result.put("orderNo", order.getOrderNo());
            result.put("orderType", order.getOrderType().name());
            result.put("amount", order.getAmount());
            result.put("vipDays", order.getVipDays());
            result.put("points", order.getPoints());

            String message;
            if (order.getOrderType() == Order.OrderType.VIP) {
                message = "兑换成功！已获得 " + order.getVipDays() + " 天VIP会员";
            } else {
                message = "兑换成功！已获得 " + order.getPoints() + " 积分";
            }
            result.put("message", message);

            return R.ok(result);
        } catch (RuntimeException e) {
            return R.badRequest(e.getMessage());
        }
    }

    /**
     * 验证卡密(不兑换，只查看信息)
     */
    @RateLimit(key = "card_validate", time = 1, count = 1, message = "操作过于频繁，请稍后再试")
    @PostMapping("/validate")
    public R<Map<String, Object>> validateCardKey(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal SysUser user,
            HttpServletRequest httpRequest) {
        String cardCode = request.get("cardCode");
        String ip = IpUtil.getClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        
        try {
            com.rawchen.entity.CardKey cardKey = cardKeyService.getByCardCode(cardCode);
            if (cardKey == null) {
                return R.badRequest("卡密不存在");
            }

            // 记录验证日志（仅登录用户）
            if (user != null) {
                userActionService.recordCardValidate(user.getId(), ip, userAgent);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("cardType", cardKey.getCardType().name());
            result.put("cardTypeName", cardKey.getCardType().getName());
            result.put("cardValue", cardKey.getCardValue());
            result.put("amount", cardKey.getAmount());
            result.put("status", cardKey.getStatus().name());
            result.put("expireTime", cardKey.getExpireTime() != null ? cardKey.getExpireTime().toString() : null);

            return R.ok(result);
        } catch (Exception e) {
            return R.badRequest("验证失败");
        }
    }
}
