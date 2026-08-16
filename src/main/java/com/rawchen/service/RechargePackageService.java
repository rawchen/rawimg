package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.RechargePackage;

import java.util.List;

/**
 * 充值套餐服务接口
 */
public interface RechargePackageService extends IService<RechargePackage> {

    /**
     * 获取启用的充值套餐列表
     */
    List<RechargePackage> getEnabledPackages();
}
