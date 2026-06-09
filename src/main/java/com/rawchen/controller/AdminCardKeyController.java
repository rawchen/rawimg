package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.CardKey;
import com.rawchen.entity.Order;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.CardKeyService;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 卡密管理Controller
 */
@RestController
@RequestMapping("/api/admin/card-keys")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminCardKeyController {

    private final CardKeyService cardKeyService;
    private final UserService userService;

    /**
     * 分页查询卡密列表
     */
    @GetMapping
    public R<Map<String, Object>> getCardKeys(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cardType,
            @RequestParam(required = false) String batchNo) {

        IPage<CardKey> cardKeys = cardKeyService.getCardKeysPage(page, size, status, cardType, batchNo);

        Map<String, Object> result = new HashMap<>();
        result.put("content", cardKeys.getRecords().stream().map(this::toCardKeyResponse).collect(Collectors.toList()));
        result.put("totalPages", cardKeys.getPages());
        result.put("totalElements", cardKeys.getTotal());
        result.put("currentPage", page);

        return R.ok(result);
    }

    /**
     * 批量生成卡密
     */
    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public R<List<Map<String, Object>>> generateCardKeys(
            @RequestParam String cardType,
            @RequestParam Integer cardValue,
            @RequestParam BigDecimal amount,
            @RequestParam Integer quantity,
            @RequestParam(required = false) Integer expireDays,
            @RequestParam(required = false) String remark) {

        if (quantity == null || quantity <= 0 || quantity > 1000) {
            return R.badRequest("生成数量必须在1-1000之间");
        }

        CardKey.CardType type = CardKey.CardType.valueOf(cardType);
        List<CardKey> cardKeys = cardKeyService.generateCardKeys(type, cardValue, amount, quantity, expireDays, remark);

        List<Map<String, Object>> result = cardKeys.stream()
                .map(this::toCardKeyResponse)
                .collect(Collectors.toList());

        return R.ok(result);
    }

    /**
     * 作废卡密
     */
    @PutMapping("/{id}/invalidate")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> invalidateCardKey(@PathVariable Long id) {
        try {
            boolean success = cardKeyService.invalidateCardKey(id);
            if (success) {
                return R.ok(null);
            } else {
                return R.notFound("卡密不存在");
            }
        } catch (RuntimeException e) {
            return R.badRequest(e.getMessage());
        }
    }

    /**
     * 获取批次号列表
     */
    @GetMapping("/batch-nos")
    public R<List<String>> getBatchNos() {
        return R.ok(cardKeyService.getBatchNoList());
    }

    /**
     * 获取卡密统计
     */
    @GetMapping("/stats")
    public R<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // 统计各状态卡密数量
        long unusedCount = cardKeyService.count(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<CardKey>()
                .eq(CardKey::getStatus, CardKey.CardStatus.UNUSED));
        long usedCount = cardKeyService.count(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<CardKey>()
                .eq(CardKey::getStatus, CardKey.CardStatus.USED));
        long expiredCount = cardKeyService.count(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<CardKey>()
                .eq(CardKey::getStatus, CardKey.CardStatus.EXPIRED));
        
        stats.put("unusedCount", unusedCount);
        stats.put("usedCount", usedCount);
        stats.put("expiredCount", expiredCount);
        stats.put("totalCount", unusedCount + usedCount + expiredCount);

        return R.ok(stats);
    }

    /**
     * 转换为响应Map
     */
    private Map<String, Object> toCardKeyResponse(CardKey cardKey) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", cardKey.getId());
        result.put("cardCode", cardKey.getCardCode());
        result.put("cardType", cardKey.getCardType().name());
        result.put("cardTypeName", cardKey.getCardType().getName());
        result.put("cardValue", cardKey.getCardValue());
        result.put("amount", cardKey.getAmount());
        result.put("status", cardKey.getStatus().name());
        result.put("statusName", cardKey.getStatus().getName());
        result.put("batchNo", cardKey.getBatchNo());
        result.put("usedBy", cardKey.getUsedBy());
        result.put("usedAt", cardKey.getUsedAt() != null ? cardKey.getUsedAt().toString() : null);
        result.put("orderId", cardKey.getOrderId());
        result.put("expireTime", cardKey.getExpireTime() != null ? cardKey.getExpireTime().toString() : null);
        result.put("remark", cardKey.getRemark());
        result.put("createTime", cardKey.getCreateTime() != null ? cardKey.getCreateTime().toString() : null);

        // 获取使用用户信息
        if (cardKey.getUsedBy() != null) {
            SysUser user = userService.getById(cardKey.getUsedBy());
            if (user != null) {
                result.put("usedByUsername", user.getUsername());
            }
        }

        return result;
    }
}
