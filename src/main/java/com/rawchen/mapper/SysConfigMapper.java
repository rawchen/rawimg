package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.SysConfig;
import org.apache.ibatis.annotations.Mapper;

/**
 * 系统配置Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findByConfigKey(key)
 * 替换为: selectOne(new LambdaQueryWrapper<SysConfig>()
 *              .eq(SysConfig::getConfigKey, key))
 */
@Mapper
public interface SysConfigMapper extends BaseMapper<SysConfig> {
    // 简单查询已迁移至Service层使用LambdaQueryWrapper
    // BaseMapper提供的内置方法已足够使用
}
