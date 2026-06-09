package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.dto.UserStats;
import com.rawchen.entity.SysUser;
import com.rawchen.mapper.SysUserMapper;
import com.rawchen.security.JwtTokenProvider;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * 用户服务实现类
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl extends ServiceImpl<SysUserMapper, SysUser> implements UserService {

    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    @Transactional
    public SysUser register(String username, String email, String password) {
        SysUser user = new SysUser();
        user.setUsername(username);
        user.setNickname(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(SysUser.UserRole.USER);
        user.setVip(false);
        user.setPoints(0);
        user.setStatus(SysUser.UserStatus.NORMAL);

        save(user);
        return user;
    }

    @Override
    public String login(String username, String password) {
        SysUser user = getOne(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, username));

        if (user == null) {
            throw new RuntimeException("无效的用户名或密码");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("无效的用户名或密码");
        }

        if (user.getStatus() == SysUser.UserStatus.BANNED) {
            throw new RuntimeException("账户已经被停用");
        }

        user.setLastLoginTime(LocalDateTime.now());
        updateById(user);

        return jwtTokenProvider.generateToken(user.getUsername(), user.getId(), user.getRole().name());
    }

    @Override
    public Optional<SysUser> findByUsername(String username) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, username);
        SysUser user = getOne(wrapper);
        return Optional.ofNullable(user);
    }

    @Override
    public Optional<SysUser> findByEmail(String email) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getEmail, email);
        SysUser user = getOne(wrapper);
        return Optional.ofNullable(user);
    }

    @Override
    public boolean checkVip(Long userId) {
        SysUser user = getById(userId);
        if (user == null) {
            return false;
        }
        if (!user.getVip()) {
            return false;
        }
        if (user.getVipExpireTime() != null && user.getVipExpireTime().isBefore(LocalDateTime.now())) {
            user.setVip(false);
            user.setVipLevel(null);
            user.setDailyDownloadCount(0);
            updateById(user);
            return false;
        }
        return true;
    }

    @Override
    public boolean checkDownloadLimit(Long userId) {
        SysUser user = getById(userId);
        if (user == null) {
            return false;
        }

        // 检查VIP是否过期
        if (!checkVip(userId)) {
            return false;
        }

        // 检查是否需要重置每日下载次数
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime resetTime = user.getDailyDownloadResetTime();

        if (resetTime == null || resetTime.toLocalDate().isBefore(now.toLocalDate())) {
            // 新的一天，重置下载次数
            user.setDailyDownloadCount(0);
            user.setDailyDownloadResetTime(now);
            updateById(user);
        }

        // 检查VIP等级和每日限制
        if (user.getVipLevel() == null) {
            return true; // 兼容旧数据，没有设置等级的VIP用户
        }

        SysUser.VipLevel level = SysUser.VipLevel.fromCode(user.getVipLevel());
        if (level == null) {
            return true; // 兼容旧数据
        }

        int currentCount = user.getDailyDownloadCount();
        int dailyLimit = level.getDailyLimit();

        return currentCount < dailyLimit;
    }

    @Override
    @Transactional
    public SysUser ensureDailyDownloadReset(Long userId) {
        SysUser user = getById(userId);
        if (user == null) {
            return null;
        }

        // 检查是否需要重置每日下载次数
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime resetTime = user.getDailyDownloadResetTime();

        if (resetTime == null || resetTime.toLocalDate().isBefore(now.toLocalDate())) {
            // 新的一天，重置下载次数
            user.setDailyDownloadCount(0);
            user.setDailyDownloadResetTime(now);
            updateById(user);
        }

        return user;
    }

    @Override
    @Transactional
    public void incrementDownloadCount(Long userId) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        user.setDailyDownloadCount(user.getDailyDownloadCount() + 1);
        updateById(user);
    }

    @Override
    @Transactional
    public SysUser updateVipStatus(Long userId, int days) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        user.setVip(true);
        LocalDateTime now = LocalDateTime.now();
        if (user.getVipExpireTime() != null && user.getVipExpireTime().isAfter(now)) {
            user.setVipExpireTime(user.getVipExpireTime().plusDays(days));
        } else {
            user.setVipExpireTime(now.plusDays(days));
            // 新开通VIP，重置每日下载次数
            user.setDailyDownloadCount(0);
            user.setDailyDownloadResetTime(now);
        }

        // 设置VIP等级
        SysUser.VipLevel level = SysUser.VipLevel.fromDays(days);
        user.setVipLevel(level.getCode());

        updateById(user);
        return user;
    }

    @Override
    @Transactional
    public SysUser updateVipStatusWithReset(Long userId, int days) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        user.setVip(true);
        LocalDateTime now = LocalDateTime.now();
        // 直接从当前时间开始计算，清空原有剩余时长
        user.setVipExpireTime(now.plusDays(days));
        // 重置每日下载次数
        user.setDailyDownloadCount(0);
        user.setDailyDownloadResetTime(now);

        // 设置VIP等级
        SysUser.VipLevel level = SysUser.VipLevel.fromDays(days);
        user.setVipLevel(level.getCode());

        updateById(user);
        return user;
    }

    @Override
    @Transactional
    public SysUser addPoints(Long userId, int points) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        user.setPoints(user.getPoints() + points);
        updateById(user);
        return user;
    }

    @Override
    @Transactional
    public SysUser deductPoints(Long userId, int points) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        if (user.getPoints() < points) {
            throw new RuntimeException("Insufficient points");
        }

        user.setPoints(user.getPoints() - points);
        updateById(user);
        return user;
    }

    @Override
    @Transactional
    public SysUser updateUser(SysUser user) {
        updateById(user);
        return user;
    }

    @Override
    public long countUsers() {
        return count();
    }

    @Override
    public long countActiveVipUsers() {
        return baseMapper.countActiveVipUsers();
    }

    @Override
    public long countUsersSince(LocalDateTime startTime) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(SysUser::getCreateTime, startTime);
        return count(wrapper);
    }

    @Override
    public IPage<SysUser> findByRole(SysUser.UserRole role, int page, int size) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getRole, role);
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public IPage<SysUser> findAll(int page, int size) {
        return page(new Page<>(page, size));
    }

    @Override
    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("原密码错误");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        updateById(user);
    }

    @Override
    public UserStats getUserStats(Long userId) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        UserStats stats = new UserStats();
        stats.setUserId(userId);

        // 获取用户行为统计
        stats.setDownloadCount(baseMapper.countUserAction(userId, "DOWNLOAD"));
        stats.setLikeCount(baseMapper.countUserAction(userId, "LIKE"));
        stats.setFavoriteCount(baseMapper.countUserAction(userId, "FAVORITE"));
        stats.setVip(user.getVip());

        // 计算VIP类型和剩余天数
        if (user.getVip() && user.getVipExpireTime() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (user.getVipExpireTime().isBefore(now)) {
                // VIP已过期
                user.setVip(false);
                user.setVipLevel(null);
                updateById(user);
                stats.setVipType("非VIP");
                stats.setVipLevel(null);
                stats.setVipRemainingDays(0);
                stats.setDailyDownloadCount(0);
                stats.setDailyDownloadLimit(0);
            } else {
                // VIP有效
                long days = ChronoUnit.DAYS.between(now, user.getVipExpireTime());
                stats.setVipRemainingDays((int) days);

                // 使用vipLevel字段获取VIP等级
                if (user.getVipLevel() != null) {
                    SysUser.VipLevel level = SysUser.VipLevel.fromCode(user.getVipLevel());
                    if (level != null) {
                        stats.setVipType(level.getName());
                        stats.setVipLevel(level.getCode());
                        stats.setDailyDownloadLimit(level.getDailyLimit());
                        stats.setDailyDownloadCount(user.getDailyDownloadCount() != null ? user.getDailyDownloadCount() : 0);
                    } else {
                        stats.setVipType("未知等级");
                        stats.setVipLevel(user.getVipLevel());
                        stats.setDailyDownloadLimit(0);
                        stats.setDailyDownloadCount(user.getDailyDownloadCount() != null ? user.getDailyDownloadCount() : 0);
                    }
                } else {
                    // 兼容旧数据，根据剩余天数计算等级
                    SysUser.VipLevel level = SysUser.VipLevel.fromDays((int) days);
                    stats.setVipType(level.getName());
                    stats.setVipLevel(level.getCode());
                    stats.setDailyDownloadLimit(level.getDailyLimit());
                    stats.setDailyDownloadCount(user.getDailyDownloadCount() != null ? user.getDailyDownloadCount() : 0);
                }
            }
        } else {
            stats.setVipType("非VIP");
            stats.setVipLevel(null);
            stats.setVipRemainingDays(0);
            stats.setDailyDownloadCount(0);
            stats.setDailyDownloadLimit(0);
        }

        return stats;
    }
}
