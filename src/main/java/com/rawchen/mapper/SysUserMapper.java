package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 系统用户Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findByUsername(username)
 * 替换为: selectOne(new LambdaQueryWrapper<SysUser>()
 *              .eq(SysUser::getUsername, username))
 * 
 * 原方法: findByEmail(email)
 * 替换为: selectOne(new LambdaQueryWrapper<SysUser>()
 *              .eq(SysUser::getEmail, email))
 * 
 * 原方法: countUsersSince(startTime)
 * 替换为: selectCount(new LambdaQueryWrapper<SysUser>()
 *              .ge(SysUser::getCreateTime, startTime))
 * 
 * 原方法: countAllUsers()
 * 替换为: selectCount(null)
 */
@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {

    /**
     * 获取有效的VIP用户列表
     * 使用NOW()函数，保留@Select
     */
    @Select("SELECT * FROM sys_user WHERE vip = 1 AND vip_expire_time > NOW() AND deleted = 0")
    List<SysUser> findActiveVipUsers();

    /**
     * 统计有效VIP用户数量
     * 使用NOW()函数，保留@Select
     */
    @Select("SELECT COUNT(*) FROM sys_user WHERE vip = 1 AND vip_expire_time > NOW() AND deleted = 0")
    long countActiveVipUsers();

    /**
     * 统计用户特定行为数量
     */
    @Select("SELECT COUNT(*) FROM user_action WHERE user_id = #{userId} AND action_type = #{actionType} AND deleted = 0")
    long countUserAction(Long userId, String actionType);
}
