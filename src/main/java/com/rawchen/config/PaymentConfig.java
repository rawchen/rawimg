package com.rawchen.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 支付配置
 */
@Data
@Component
@ConfigurationProperties(prefix = "payment.yungouos")
public class PaymentConfig {

    /**
     * 微信支付商户号
     */
    private String mchId;

    /**
     * 商户密钥
     */
    private String key;

    /**
     * 支付回调地址
     */
    private String notifyUrl;

    /**
     * 是否启用（用于测试环境）
     */
    private Boolean enabled = true;
}
