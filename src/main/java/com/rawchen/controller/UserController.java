package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.annotation.RateLimit;
import com.rawchen.dto.PageResponse;
import com.rawchen.dto.UserProfileResponse;
import com.rawchen.dto.UserStats;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.EmailService;
import com.rawchen.service.UserActionService;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserActionService userActionService;
    private final EmailService emailService;

    @GetMapping("/users/me")
    public R<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal SysUser user) {
        if (user == null) {
            return R.unauthorized();
        }
        // 从数据库重新获取用户信息,并确保下载次数已重置
        SysUser refreshedUser = userService.getById(user.getId());
        refreshedUser = userService.ensureDailyDownloadReset(refreshedUser.getId());
        return R.ok(UserProfileResponse.from(refreshedUser));
    }

    @GetMapping("/users/{id}")
    public R<UserProfileResponse> getUserProfile(@PathVariable Long id) {
        SysUser user = userService.getById(id);
        if (user == null) {
            return R.notFound("用户不存在");
        }
        return R.ok(UserProfileResponse.from(user));
    }

    @PutMapping("/users/profile")
    public R<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal SysUser user,
            @RequestBody java.util.Map<String, String> request) {

        if (user == null) {
            return R.unauthorized();
        }

        if (request.containsKey("avatar")) {
            user.setAvatar(request.get("avatar"));
        }
        if (request.containsKey("email")) {
            user.setEmail(request.get("email"));
        }

        user = userService.updateUser(user);
        return R.ok(UserProfileResponse.from(user));
    }

    @GetMapping("/users/{id}/favorites")
    public R<PageResponse<com.rawchen.entity.Gallery>> getUserFavorites(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        IPage<com.rawchen.entity.Gallery> favorites = userActionService.getFavoriteGalleries(id, page, size);
        return R.ok(PageResponse.of(favorites, page));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<PageResponse<UserProfileResponse>> getAllUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) SysUser.UserRole role) {

        IPage<SysUser> users;
        if (role != null) {
            users = userService.findByRole(role, page, size);
        } else {
            users = userService.findAll(page, size);
        }

        return R.ok(PageResponse.of(users, page, UserProfileResponse::from));
    }

    @PutMapping("/admin/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public R<UserProfileResponse> updateUserRole(
            @PathVariable Long id,
            @RequestParam SysUser.UserRole role) {

        SysUser user = userService.getById(id);
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        user.setRole(role);
        user = userService.updateUser(user);

        return R.ok(UserProfileResponse.from(user));
    }

    @PutMapping("/admin/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public R<UserProfileResponse> updateUserStatus(
            @PathVariable Long id,
            @RequestParam SysUser.UserStatus status) {

        SysUser user = userService.getById(id);
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        user.setStatus(status);
        user = userService.updateUser(user);

        return R.ok(UserProfileResponse.from(user));
    }

    @GetMapping("/users/stats")
    public R<UserStats> getUserStats(@AuthenticationPrincipal SysUser user) {
        if (user == null) {
            return R.unauthorized();
        }
        UserStats stats = userService.getUserStats(user.getId());
        return R.ok(stats);
    }

    @RateLimit(key = "send-email-code", time = 60, count = 1, message = "验证码发送过于频繁，请60秒后再试")
    @PostMapping("/users/send-email-code")
    public R<Void> sendEmailCode(
            @AuthenticationPrincipal SysUser user,
            @RequestBody Map<String, String> request) {

        if (user == null) {
            return R.unauthorized();
        }

        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return R.fail("邮箱不能为空");
        }

        // 检查邮箱是否已被其他用户使用
        if (!email.equals(user.getEmail())) {
            if (userService.findByEmail(email).isPresent()) {
                return R.fail("该邮箱已被使用");
            }
        }

        String code = emailService.generateCode();
        try {
            emailService.sendVerificationCode(email, code);
        } catch (Exception e) {
            return R.fail("发送验证码失败: " + e.getMessage());
        }
        return R.ok();
    }

    @PutMapping("/users/update-email")
    public R<UserProfileResponse> updateEmail(
            @AuthenticationPrincipal SysUser user,
            @RequestBody Map<String, String> request) {

        if (user == null) {
            return R.unauthorized();
        }

        String email = request.get("email");
        String code = request.get("code");

        if (email == null || email.trim().isEmpty()) {
            return R.fail("邮箱不能为空");
        }

        if (code == null || code.trim().isEmpty()) {
            return R.fail("验证码不能为空");
        }

        // 验证验证码
        if (!emailService.verifyCode(email, code)) {
            return R.fail("验证码错误或已过期");
        }

        // 检查邮箱是否已被其他用户使用
        if (!email.equals(user.getEmail())) {
            if (userService.findByEmail(email).isPresent()) {
                return R.fail("该邮箱已被使用");
            }
        }

        user.setEmail(email);
        user = userService.updateUser(user);
        return R.ok(UserProfileResponse.from(user));
    }

    @PutMapping("/users/update-nickname")
    public R<UserProfileResponse> updateNickname(
            @AuthenticationPrincipal SysUser user,
            @RequestBody Map<String, String> request) {

        if (user == null) {
            return R.unauthorized();
        }

        String nickname = request.get("nickname");
        if (nickname == null || nickname.trim().isEmpty()) {
            return R.fail("昵称不能为空");
        }

        user.setNickname(nickname);
        user = userService.updateUser(user);
        return R.ok(UserProfileResponse.from(user));
    }

    @PutMapping("/users/change-password")
    public R<Void> changePassword(
            @AuthenticationPrincipal SysUser user,
            @RequestBody Map<String, String> request) {

        if (user == null) {
            return R.unauthorized();
        }

        String oldPassword = request.get("oldPassword");
        String newPassword = request.get("newPassword");
        String confirmPassword = request.get("confirmPassword");

        if (oldPassword == null || oldPassword.trim().isEmpty()) {
            return R.fail("原密码不能为空");
        }

        if (newPassword == null || newPassword.trim().isEmpty()) {
            return R.fail("新密码不能为空");
        }

        if (confirmPassword == null || confirmPassword.trim().isEmpty()) {
            return R.fail("确认密码不能为空");
        }

        if (!newPassword.equals(confirmPassword)) {
            return R.fail("两次输入的密码不一致");
        }

        if (newPassword.length() < 6) {
            return R.fail("密码长度不能少于6位");
        }
        try {
            userService.changePassword(user.getId(), oldPassword, newPassword);
        } catch (Exception e) {
            log.error("修改密码失败：{}", e.getMessage());
            return R.fail(e.getMessage());
        }
        return R.ok();
    }
}
