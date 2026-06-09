package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.SysConfig;

import java.util.List;

/**
 * 系统配置服务接口
 */
public interface ConfigService extends IService<SysConfig> {

    /**
     * 获取配置值
     */
    String getConfigValue(String key);

    /**
     * 获取配置值（带默认值）
     */
    String getConfigValue(String key, String defaultValue);

    /**
     * 获取整数配置值
     */
    int getConfigIntValue(String key, int defaultValue);

    /**
     * 设置配置
     */
    SysConfig setConfig(String key, String value, String type, String description);

    /**
     * 获取所有配置
     */
    List<SysConfig> getAllConfigs();

    /**
     * 删除配置
     */
    void deleteConfig(Long id);

    /**
     * 初始化默认配置
     */
    void initializeDefaultConfigs();
}
