package com.rawchen.service.impl;

import com.rawchen.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Random;
import java.util.concurrent.TimeUnit;

/**
 * 邮件服务实现类
 */
@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${spring.mail.username:noreply@rawimg.com}")
    private String fromEmail;

    @Value("${app.email.verification.expire:300}")
    private long codeExpireSeconds;

    @Autowired
    public EmailServiceImpl(JavaMailSender mailSender, RedisTemplate<String, String> redisTemplate) {
        this.mailSender = mailSender;
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void sendVerificationCode(String email, String code) {
        // 验证码存储到 Redis，5分钟过期
        String key = "email:code:" + email;
        redisTemplate.opsForValue().set(key, code, codeExpireSeconds, TimeUnit.SECONDS);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("RawImg 邮箱验证码");
            message.setText("您的验证码是：【" + code + "】，5分钟内有效。请勿将验证码泄露给他人。");

            mailSender.send(message);
        } catch (Exception e) {
            // 发送失败，删除已存储的验证码
            redisTemplate.delete(key);
            log.error("发送邮件失败: {}", e.getMessage());
            throw new RuntimeException("邮箱地址输入有误");
        }
    }

    @Override
    public boolean verifyCode(String email, String code) {
        String key = "email:code:" + email;
        String storedCode = redisTemplate.opsForValue().get(key);

        if (StringUtils.hasText(storedCode) && storedCode.equals(code)) {
            // 验证成功，删除验证码
            redisTemplate.delete(key);
            return true;
        }

        return false;
    }

    /**
     * 生成6位随机验证码
     */
    public String generateCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }
}
