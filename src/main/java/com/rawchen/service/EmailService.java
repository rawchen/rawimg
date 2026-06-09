package com.rawchen.service;

/**
 * 邮件服务接口
 */
public interface EmailService {

    /**
     * 发送邮箱验证码
     */
    void sendVerificationCode(String email, String code);

    /**
     * 验证验证码是否正确
     */
    boolean verifyCode(String email, String code);

    /**
     * 生成随机验证码
     */
    String generateCode();

}
