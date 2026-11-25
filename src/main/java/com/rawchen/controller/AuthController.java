package com.rawchen.controller;

import com.rawchen.annotation.RateLimit;
import com.rawchen.dto.AuthResponse;
import com.rawchen.dto.LoginRequest;
import com.rawchen.dto.RegisterRequest;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.EmailService;
import com.rawchen.service.UserService;
import com.rawchen.service.impl.EmailServiceImpl;
import com.rawchen.util.CaptchaUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final EmailService emailService;

    @RateLimit(key = "send-email-code", time = 60, count = 1, message = "验证码发送过于频繁，请60秒后再试")
    @PostMapping("/send-email-code")
    public R<Void> sendRegisterEmailCode(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return R.fail("邮箱不能为空");
        }

        // 检查邮箱格式
        if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            return R.fail("邮箱格式不正确");
        }

        // 检查邮箱是否已被注册
        if (userService.findByEmail(email).isPresent()) {
            return R.fail("该邮箱已被注册");
        }

        // 生成并发送验证码
        String code = emailService.generateCode();
        try {
            emailService.sendVerificationCode(email, code);
        } catch (Exception e) {
            return R.fail("发送验证码失败: " + e.getMessage());
        }
        return R.ok();
    }

    @RateLimit(key = "register", time = 1, count = 1, message = "操作过于频繁，请稍后再试")
    @PostMapping("/register")
    public R<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // Validate captcha
        if (!validateCaptchaIfPresent(request.getCaptchaSessionId(), request.getCaptchaAnswer())) {
            return R.fail("验证码错误");
        }

        // 验证邮箱验证码
        if (request.getEmailCode() == null || request.getEmailCode().trim().isEmpty()) {
            return R.fail("邮箱验证码不能为空");
        }

        // 先检查用户名和邮箱是否已存在，避免浪费验证码
        if (userService.findByUsername(request.getUsername()).isPresent()) {
            return R.fail("用户名已存在");
        }
        if (userService.findByEmail(request.getEmail()).isPresent()) {
            return R.fail("邮箱已存在");
        }

        if (!emailService.verifyCode(request.getEmail(), request.getEmailCode())) {
            return R.fail("邮箱验证码错误或已过期");
        }

        SysUser user;
        String token;
        try {
            user = userService.register(request.getUsername(), request.getEmail(), request.getPassword());
            token = userService.login(request.getUsername(), request.getPassword());
        } catch (Exception e) {
            return R.fail(e.getMessage());
        }

        AuthResponse response = new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getVip(),
                user.getVipExpireTime(),
                user.getVipLevel(),
                user.getDailyDownloadCount(),
                user.getDailyDownloadResetTime() != null && user.getVipLevel() != null ?
                        SysUser.VipLevel.fromCode(user.getVipLevel()) != null ?
                                SysUser.VipLevel.fromCode(user.getVipLevel()).getDailyLimit() : 0 : 0,
                user.getPoints(),
                user.getAvatar()
        );

        return R.ok(response);
    }

    @PostMapping("/login")
    public R<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        // Validate captcha
        if (!validateCaptchaIfPresent(request.getCaptchaSessionId(), request.getCaptchaAnswer())) {
            return R.fail("验证码错误");
        }
        String token;
        try {
            token = userService.login(request.getUsername(), request.getPassword());
        } catch (Exception e) {
            return R.fail(e.getMessage());
        }
        SysUser user = userService.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        AuthResponse response = new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getVip(),
                user.getVipExpireTime(),
                user.getVipLevel(),
                user.getDailyDownloadCount(),
                user.getDailyDownloadResetTime() != null && user.getVipLevel() != null ?
                        SysUser.VipLevel.fromCode(user.getVipLevel()) != null ?
                                SysUser.VipLevel.fromCode(user.getVipLevel()).getDailyLimit() : 0 : 0,
                user.getPoints(),
                user.getAvatar()
        );

        return R.ok(response);
    }

    @RateLimit(key = "captcha", time = 60, count = 10, message = "验证码获取过于频繁，请稍后再试")
    @PostMapping("/captcha")
    public R<Map<String, Object>> getCaptcha() {
        String sessionId = CaptchaUtil.newSessionId();
        Map<String, Object> captcha = CaptchaUtil.generateCaptcha(sessionId);
        return R.ok(captcha);
    }

    /**
     * 按需校验验证码。
     * <p>
     * 未携带验证码字段时跳过校验；答案非数字时按校验失败处理，
     * 避免 {@link NumberFormatException} 抛出导致接口 500，
     * 也避免校验失败时验证码条目残留。
     *
     * @param sessionId 验证码会话 ID
     * @param answer    用户提交的答案
     * @return 是否通过校验
     */
    private boolean validateCaptchaIfPresent(String sessionId, String answer) {
        if (sessionId == null || sessionId.trim().isEmpty()
                || answer == null || answer.trim().isEmpty()) {
            return true;
        }
        int parsedAnswer;
        try {
            parsedAnswer = Integer.parseInt(answer.trim());
        } catch (NumberFormatException e) {
            return false;
        }
        return CaptchaUtil.validateCaptcha(sessionId, parsedAnswer);
    }

    @GetMapping("/me")
    public R<AuthResponse> getCurrentUser(@AuthenticationPrincipal SysUser user) {
        if (user == null) {
            return R.unauthorized();
        }

        // 从数据库重新获取用户信息并确保下载次数已重置
        SysUser refreshedUser = userService.getById(user.getId());
        refreshedUser = userService.ensureDailyDownloadReset(refreshedUser.getId());

        AuthResponse response = new AuthResponse(
                null,
                refreshedUser.getId(),
                refreshedUser.getUsername(),
                refreshedUser.getEmail(),
                refreshedUser.getRole().name(),
                refreshedUser.getVip(),
                refreshedUser.getVipExpireTime(),
                refreshedUser.getVipLevel(),
                refreshedUser.getDailyDownloadCount(),
                refreshedUser.getDailyDownloadResetTime() != null && refreshedUser.getVipLevel() != null ?
                        SysUser.VipLevel.fromCode(refreshedUser.getVipLevel()) != null ?
                                SysUser.VipLevel.fromCode(refreshedUser.getVipLevel()).getDailyLimit() : 0 : 0,
                refreshedUser.getPoints(),
                refreshedUser.getAvatar()
        );

        return R.ok(response);
    }

    @PostMapping("/logout")
    public R<Void> logout() {
        // JWT is stateless, so logout is handled on client side
        return R.ok();
    }
}
