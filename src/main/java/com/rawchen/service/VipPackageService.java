package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.VipPackage;

import java.util.List;

/**
 * VIP套餐服务接口
 */
public interface VipPackageService extends IService<VipPackage> {

    /**
     * 获取所有启用的套餐（按排序顺序）
     */
    List<VipPackage> getEnabledPackages();

    /**
     * 获取所有套餐（管理端，包含禁用的）
     */
    List<VipPackage> getAllPackages();

    /**
     * 创建套餐
     */
    VipPackage createPackage(VipPackage vipPackage);

    /**
     * 更新套餐
     */
    VipPackage updatePackage(Long id, VipPackage vipPackage);

    /**
     * 删除套餐
     */
    boolean deletePackage(Long id);

    /**
     * 切换套餐启用状态
     */
    VipPackage toggleEnabled(Long id);
}
