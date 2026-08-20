package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.SysConfig;
import com.rawchen.mapper.SysConfigMapper;
import com.rawchen.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import java.util.List;

/**
 * 系统配置服务实现类
 */
@Service
@RequiredArgsConstructor
public class ConfigServiceImpl extends ServiceImpl<SysConfigMapper, SysConfig> implements ConfigService {

    @Override
    public String getConfigValue(String key) {
        LambdaQueryWrapper<SysConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysConfig::getConfigKey, key);
        SysConfig config = getOne(wrapper);
        return config != null ? config.getConfigValue() : null;
    }

    @Override
    public String getConfigValue(String key, String defaultValue) {
        String value = getConfigValue(key);
        return value != null ? value : defaultValue;
    }

    @Override
    public int getConfigIntValue(String key, int defaultValue) {
        String value = getConfigValue(key);
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    @Override
    @Transactional
    public SysConfig setConfig(String key, String value, String type, String description) {
        LambdaQueryWrapper<SysConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysConfig::getConfigKey, key);
        SysConfig existing = getOne(wrapper);

        SysConfig config = new SysConfig();
        if (existing == null) {
            config = new SysConfig();
            config.setConfigKey(key);
            config.setConfigValue(value);
            config.setConfigType(type);
            config.setDescription(description);
            save(config);
        }
        return config;
    }

    @Override
    public List<SysConfig> getAllConfigs() {
        return list();
    }

    @Override
    @Transactional
    public void deleteConfig(Long id) {
        removeById(id);
    }

    @PostConstruct
    @Override
    public void initializeDefaultConfigs() {
        if (getConfigValue("free_preview_limit") == null) {
            setConfig("free_preview_limit", "3", "number", "非会员可预览的图片数量");
        }
        if (getConfigValue("points_rate") == null) {
            setConfig("points_rate", "100", "number", "积分兑换比例(1元=100积分)");
        }
        if (getConfigValue("site_title") == null) {
            setConfig("site_title", "RawImg", "string", "网站标题");
        }
        if (getConfigValue("site_description") == null) {
            setConfig("site_description", "在线RAW图片编辑器，类似Lightroom的Web端照片处理工具。", "string", "网站描述");
        }
        if (getConfigValue("captcha_enabled") == null) {
            setConfig("captcha_enabled", "true", "boolean", "是否启用验证码");
        }
        if (getConfigValue("card_key_purchase_url") == null) {
            setConfig("card_key_purchase_url", "https://baidu.com", "string", "卡密购买地址（发卡网链接）");
        }
        if (getConfigValue("fake_active_base_count") == null) {
            setConfig("fake_active_base_count", "0", "number", "基础假人数，0禁用，默认上下浮动5");
        }
        if (getConfigValue("register_initial_balance") == null) {
            setConfig("register_initial_balance", "0.1", "number", "注册初始余额");
        }
    }
}
