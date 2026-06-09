package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.CardKey;
import com.rawchen.entity.Order;
import com.rawchen.entity.SysUser;
import com.rawchen.mapper.CardKeyMapper;
import com.rawchen.service.CardKeyService;
import com.rawchen.service.OrderService;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 卡密服务实现类
 */
@Service
@RequiredArgsConstructor
public class CardKeyServiceImpl extends ServiceImpl<CardKeyMapper, CardKey> implements CardKeyService {

    private final UserService userService;
    private final OrderService orderService;

    @Override
    @Transactional
    public List<CardKey> generateCardKeys(CardKey.CardType cardType, Integer cardValue,
                                          BigDecimal amount, int quantity,
                                          Integer expireDays, String remark) {
        List<CardKey> cardKeys = new ArrayList<>();
        String batchNo = "B" + System.currentTimeMillis();

        LocalDateTime expireTime = null;
        if (expireDays != null && expireDays > 0) {
            expireTime = LocalDateTime.now().plusDays(expireDays);
        }

        for (int i = 0; i < quantity; i++) {
            CardKey cardKey = new CardKey();
            cardKey.setCardCode(generateCardCode());
            cardKey.setCardType(cardType);
            cardKey.setCardValue(cardValue);
            cardKey.setAmount(amount);
            cardKey.setStatus(CardKey.CardStatus.UNUSED);
            cardKey.setBatchNo(batchNo);
            cardKey.setExpireTime(expireTime);
            cardKey.setRemark(remark);
            cardKeys.add(cardKey);
        }

        saveBatch(cardKeys);
        return cardKeys;
    }

    @Override
    @Transactional
    public Order redeemCardKey(Long userId, String cardCode) {
        // 查询卡密
        CardKey cardKey = getByCardCode(cardCode);
        if (cardKey == null) {
            throw new RuntimeException("卡密不存在");
        }

        // 检查状态
        if (cardKey.getStatus() == CardKey.CardStatus.USED) {
            throw new RuntimeException("卡密已被使用");
        }

        if (cardKey.getStatus() == CardKey.CardStatus.EXPIRED) {
            throw new RuntimeException("卡密已过期");
        }

        // 检查过期时间
        if (cardKey.getExpireTime() != null && cardKey.getExpireTime().isBefore(LocalDateTime.now())) {
            cardKey.setStatus(CardKey.CardStatus.EXPIRED);
            updateById(cardKey);
            throw new RuntimeException("卡密已过期");
        }

        // 检查用户
        SysUser user = userService.getById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        // 创建订单
        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setAmount(cardKey.getAmount());
        order.setPaymentMethod(Order.PaymentMethod.CARD_KEY);
        order.setStatus(Order.OrderStatus.PAID);
        order.setTransactionId("CARD_" + cardKey.getId());
        order.setPayTime(LocalDateTime.now());
        order.setCardKeyId(cardKey.getId());

        // 设置订单类型和值
        if (cardKey.getCardType() == CardKey.CardType.POINTS) {
            order.setOrderType(Order.OrderType.POINTS);
            order.setPoints(cardKey.getCardValue());
        } else {
            order.setOrderType(Order.OrderType.VIP);
            order.setVipDays(cardKey.getCardValue());
        }

        orderService.save(order);

        // 更新卡密状态
        cardKey.setStatus(CardKey.CardStatus.USED);
        cardKey.setUsedBy(userId);
        cardKey.setUsedAt(LocalDateTime.now());
        cardKey.setOrderId(order.getId());
        updateById(cardKey);

        // 处理订单（充值VIP或积分）
        if (order.getOrderType() == Order.OrderType.VIP) {
            // 卡密兑换VIP，清空原有剩余时长，直接使用卡密时长
            userService.updateVipStatusWithReset(userId, order.getVipDays());
        } else if (order.getOrderType() == Order.OrderType.POINTS) {
            userService.addPoints(userId, order.getPoints());
        }

        return order;
    }

    @Override
    public CardKey getByCardCode(String cardCode) {
        LambdaQueryWrapper<CardKey> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CardKey::getCardCode, cardCode);
        return getOne(wrapper);
    }

    @Override
    public IPage<CardKey> getCardKeysPage(int page, int size, String status, String cardType, String batchNo) {
        LambdaQueryWrapper<CardKey> wrapper = new LambdaQueryWrapper<>();

        if (status != null && !status.isEmpty()) {
            wrapper.eq(CardKey::getStatus, CardKey.CardStatus.valueOf(status));
        }
        if (cardType != null && !cardType.isEmpty()) {
            wrapper.eq(CardKey::getCardType, CardKey.CardType.valueOf(cardType));
        }
        if (batchNo != null && !batchNo.isEmpty()) {
            wrapper.eq(CardKey::getBatchNo, batchNo);
        }

        wrapper.orderByDesc(CardKey::getCreateTime);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    @Transactional
    public boolean invalidateCardKey(Long id) {
        CardKey cardKey = getById(id);
        if (cardKey == null) {
            return false;
        }
        if (cardKey.getStatus() == CardKey.CardStatus.USED) {
            throw new RuntimeException("已使用的卡密不能作废");
        }
        cardKey.setStatus(CardKey.CardStatus.EXPIRED);
        return updateById(cardKey);
    }

    @Override
    public List<String> getBatchNoList() {
        LambdaQueryWrapper<CardKey> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(CardKey::getBatchNo);
        wrapper.groupBy(CardKey::getBatchNo);
        wrapper.orderByDesc(CardKey::getCreateTime);

        List<CardKey> cardKeys = list(wrapper);
        List<String> batchNos = new ArrayList<>();
        for (CardKey cardKey : cardKeys) {
            if (cardKey.getBatchNo() != null) {
                batchNos.add(cardKey.getBatchNo());
            }
        }
        return batchNos;
    }

    /**
     * 生成卡密码(16位大写字母+数字)
     */
    private String generateCardCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /**
     * 生成订单号
     */
    private String generateOrderNo() {
        return "LL" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
