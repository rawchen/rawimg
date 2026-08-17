package com.rawchen.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.extra.qrcode.QrCodeUtil;
import cn.hutool.http.HttpUtil;
import com.alibaba.fastjson.JSON;

import java.io.ByteArrayInputStream;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.config.PaymentConfig;
import com.rawchen.dto.RechargeOrderDTO;
import com.rawchen.entity.RechargeOrder;
import com.rawchen.entity.RechargePackage;
import com.rawchen.mapper.RechargeOrderMapper;
import com.rawchen.service.RechargeOrderService;
import com.rawchen.service.RechargePackageService;
import com.rawchen.service.UserBalanceService;
import com.yungouos.pay.wxpay.WxPay;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 充值订单服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RechargeOrderServiceImpl extends ServiceImpl<RechargeOrderMapper, RechargeOrder> implements RechargeOrderService {

    private final PaymentConfig paymentConfig;
    private final RechargePackageService rechargePackageService;
    private final UserBalanceService userBalanceService;

    @Override
    @Transactional
    public RechargeOrder createOrder(Long userId, BigDecimal amount, String paymentMethod) {
        // 查找对应的充值套餐
        RechargePackage pkg = findPackageByAmount(amount);
        if (pkg == null) {
            throw new IllegalArgumentException("充值金额无效");
        }

        // 计算实付金额（根据支付方式折扣）
        BigDecimal paidAmount = calculatePaidAmount(amount, paymentMethod);

        // 生成订单号
        String orderNo = generateOrderNo(paymentMethod);

        // 创建订单
        RechargeOrder order = new RechargeOrder();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setAmount(amount);
        order.setCreditAmount(pkg.getCreditAmount());
        order.setBonusAmount(pkg.getBonusAmount());
        order.setPaidAmount(paidAmount);
        order.setPaymentMethod(paymentMethod);
        order.setPaymentChannel(getPaymentChannelDesc(paymentMethod));
        order.setStatus("PENDING");
        order.setExpireTime(LocalDateTime.now().plusMinutes(30)); // 30分钟后过期

        // 调用支付接口
        try {
            String qrCodeUrl = createPayment(orderNo, paidAmount, paymentMethod);
            order.setQrCodeUrl(qrCodeUrl);
            
            // 识别二维码内容
            String payUrl = decodeQrCode(qrCodeUrl);
            order.setPayUrl(payUrl);
        } catch (Exception e) {
            log.error("创建支付订单失败", e);
            order.setStatus("FAILED");
        }

        save(order);
        return order;
    }

    @Override
    @Transactional
    public void handlePaymentCallback(String orderNo, String transactionId, BigDecimal paidAmount) {
        // 查询订单
        LambdaQueryWrapper<RechargeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RechargeOrder::getOrderNo, orderNo);
        RechargeOrder order = getOne(wrapper);

        if (order == null) {
            log.warn("订单不存在: {}", orderNo);
            return;
        }

        // 检查订单状态，防止重复处理
        if ("SUCCESS".equals(order.getStatus())) {
            log.info("订单已处理: {}", orderNo);
            return;
        }

        // 更新订单状态
        order.setStatus("SUCCESS");
        order.setTransactionId(transactionId);
        order.setPayTime(LocalDateTime.now());
        updateById(order);

        // 充值余额
        BigDecimal creditAmount = order.getCreditAmount();
        userBalanceService.recharge(order.getUserId(), creditAmount);

        log.info("订单支付成功，订单号: {}, 充值金额: {}", orderNo, creditAmount);
    }

    @Override
    public RechargeOrder queryOrderStatus(String orderNo) {
        LambdaQueryWrapper<RechargeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RechargeOrder::getOrderNo, orderNo);
        return getOne(wrapper);
    }

    @Override
    public IPage<RechargeOrderDTO> getUserOrderPage(Long userId, String status, String searchOrderNo, Integer page, Integer size) {
        LambdaQueryWrapper<RechargeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RechargeOrder::getUserId, userId);

        if (StrUtil.isNotBlank(status)) {
            wrapper.eq(RechargeOrder::getStatus, status);
        }

        if (StrUtil.isNotBlank(searchOrderNo)) {
            wrapper.like(RechargeOrder::getOrderNo, searchOrderNo);
        }

        wrapper.orderByDesc(RechargeOrder::getCreateTime);

        Page<RechargeOrder> pageParam = new Page<>(page, size);
        IPage<RechargeOrder> orderPage = page(pageParam, wrapper);

        // 转换为DTO
        IPage<RechargeOrderDTO> dtoPage = new Page<>(orderPage.getCurrent(), orderPage.getSize(), orderPage.getTotal());
        List<RechargeOrderDTO> dtoList = orderPage.getRecords().stream().map(order -> {
            RechargeOrderDTO dto = new RechargeOrderDTO();
            BeanUtils.copyProperties(order, dto);
            return dto;
        }).collect(Collectors.toList());
        dtoPage.setRecords(dtoList);

        return dtoPage;
    }

    @Override
    @Transactional
    public void updateExpiredOrders() {
        LambdaUpdateWrapper<RechargeOrder> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(RechargeOrder::getStatus, "PENDING")
                .lt(RechargeOrder::getExpireTime, LocalDateTime.now())
                .set(RechargeOrder::getStatus, "EXPIRED");
        update(wrapper);
    }

    /**
     * 根据金额查找充值套餐
     */
    private RechargePackage findPackageByAmount(BigDecimal amount) {
        LambdaQueryWrapper<RechargePackage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RechargePackage::getAmount, amount)
                .eq(RechargePackage::getEnabled, true);
        return rechargePackageService.getOne(wrapper);
    }

    /**
     * 计算实付金额（根据支付方式折扣）
     */
    private BigDecimal calculatePaidAmount(BigDecimal amount, String paymentMethod) {
        // 微信支付折扣95折
        if ("WECHAT".equals(paymentMethod)) {
            return amount.multiply(new BigDecimal("0.95")).setScale(2, RoundingMode.HALF_UP);
        }
        // 支付宝无折扣
        return amount;
    }

    /**
     * 生成订单号
     */
    private String generateOrderNo(String paymentMethod) {
        String prefix = "WECHAT".equals(paymentMethod) ? "USR" : "ALI";
        return prefix + IdUtil.getSnowflakeNextIdStr();
    }

    /**
     * 获取支付渠道描述
     */
    private String getPaymentChannelDesc(String paymentMethod) {
        if ("WECHAT".equals(paymentMethod)) {
            return "微信";
        } else if ("ALIPAY".equals(paymentMethod)) {
            return "支付宝";
        }
        return paymentMethod;
    }

    /**
     * 创建支付订单
     */
    private String createPayment(String orderNo, BigDecimal amount, String paymentMethod) throws Exception {
        if (!paymentConfig.getEnabled()) {
            // 测试环境返回模拟二维码
            return "http://images.yungouos.com/wxpay/native/code/test_" + orderNo + ".png";
        }

        // 微信支付
        if ("WECHAT".equals(paymentMethod)) {
            return WxPay.nativePay(
                    orderNo,
                    amount.toString(),
                    paymentConfig.getMchId(),
                    "余额充值",
                    "2", // 返回二维码地址
                    null,
                    null,
                    paymentConfig.getNotifyUrl(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    paymentConfig.getKey()
            );
        }

        // 支付宝（预留）
        if ("ALIPAY".equals(paymentMethod)) {
            // TODO: 实现支付宝支付
            throw new IllegalArgumentException("支付宝支付暂未开放");
        }

        throw new IllegalArgumentException("不支持的支付方式");
    }

    /**
     * 识别二维码图片内容
     */
    private String decodeQrCode(String qrCodeUrl) {
        try {
            // 下载二维码图片
            byte[] imageBytes = HttpUtil.downloadBytes(qrCodeUrl);
            
            // 识别二维码内容
            return QrCodeUtil.decode(new ByteArrayInputStream(imageBytes));
        } catch (Exception e) {
            log.error("识别二维码失败: {}", qrCodeUrl, e);
            return null;
        }
    }
}
