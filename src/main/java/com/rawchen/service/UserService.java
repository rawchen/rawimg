package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.UserStats;
import com.rawchen.entity.SysUser;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 用户服务接口
 */
public interface UserService extends IService<SysUser> {

    /**
     * 用户注册
     */
    SysUser register(String username, String email, String password);

    /**
     * 用户登录
     */
    String login(String username, String password);

    /**
     * 根据用户名查找用户
     */
    Optional<SysUser> findByUsername(String username);

    /**
     * 根据邮箱查找用户
     */
    Optional<SysUser> findByEmail(String email);

    /**
     * 检查VIP状态
     */
    boolean checkVip(Long userId);

    /**
     * 检查下载次数限制
     */
    boolean checkDownloadLimit(Long userId);

    /**
     * 确保每日下载次数已重置
     * 如果是新的一天，自动重置下载次数并返回更新后的用户信息
     */
    SysUser ensureDailyDownloadReset(Long userId);

    /**
     * 增加下载次数
     */
    void incrementDownloadCount(Long userId);

    /**
     * 更新VIP状态（累加时长）
     */
    SysUser updateVipStatus(Long userId, int days);

    /**
     * 更新VIP状态（覆盖时长，用于卡密兑换）
     * 清空原有剩余时长，直接使用新的天数
     */
    SysUser updateVipStatusWithReset(Long userId, int days);

    /**
     * 增加积分
     */
    SysUser addPoints(Long userId, int points);

    /**
     * 扣除积分
     */
    SysUser deductPoints(Long userId, int points);

    /**
     * 更新用户
     */
    SysUser updateUser(SysUser user);

    /**
     * 统计用户总数
     */
    long countUsers();

    /**
     * 统计活跃VIP用户数
     */
    long countActiveVipUsers();

    /**
     * 统计指定时间以来的用户数
     */
    long countUsersSince(LocalDateTime startTime);

    /**
     * 按角色查找用户（分页）
     */
    IPage<SysUser> findByRole(SysUser.UserRole role, int page, int size);

    /**
     * 查找所有用户（分页）
     */
    IPage<SysUser> findAll(int page, int size);

    /**
     * 修改密码
     */
    void changePassword(Long userId, String oldPassword, String newPassword);

    /**
     * 获取用户统计数据
     */
    UserStats getUserStats(Long userId);
}
