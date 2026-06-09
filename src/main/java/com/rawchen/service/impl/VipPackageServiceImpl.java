package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.VipPackage;
import com.rawchen.mapper.VipPackageMapper;
import com.rawchen.service.VipPackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * VIP套餐服务实现
 */
@Service
@RequiredArgsConstructor
public class VipPackageServiceImpl extends ServiceImpl<VipPackageMapper, VipPackage> implements VipPackageService {

    @Override
    public List<VipPackage> getEnabledPackages() {
        return list(new LambdaQueryWrapper<VipPackage>()
                .eq(VipPackage::getEnabled, true)
                .orderByAsc(VipPackage::getSortOrder));
    }

    @Override
    public List<VipPackage> getAllPackages() {
        return list(new LambdaQueryWrapper<VipPackage>()
                .orderByAsc(VipPackage::getSortOrder));
    }

    @Override
    @Transactional
    public VipPackage createPackage(VipPackage vipPackage) {
        // 如果未设置排序，设置为最大值+1
        if (vipPackage.getSortOrder() == null) {
            VipPackage maxOrder = lambdaQuery()
                    .select(VipPackage::getSortOrder)
                    .orderByDesc(VipPackage::getSortOrder)
                    .last("LIMIT 1")
                    .one();
            vipPackage.setSortOrder(maxOrder != null ? maxOrder.getSortOrder() + 1 : 1);
        }
        // 默认启用
        if (vipPackage.getEnabled() == null) {
            vipPackage.setEnabled(true);
        }
        // 默认不热门
        if (vipPackage.getPopular() == null) {
            vipPackage.setPopular(false);
        }
        save(vipPackage);
        return vipPackage;
    }

    @Override
    @Transactional
    public VipPackage updatePackage(Long id, VipPackage vipPackage) {
        VipPackage existing = getById(id);
        if (existing == null) {
            throw new RuntimeException("套餐不存在");
        }
        vipPackage.setId(id);
        updateById(vipPackage);
        return getById(id);
    }

    @Override
    @Transactional
    public boolean deletePackage(Long id) {
        return removeById(id);
    }

    @Override
    @Transactional
    public VipPackage toggleEnabled(Long id) {
        VipPackage vipPackage = getById(id);
        if (vipPackage == null) {
            throw new RuntimeException("套餐不存在");
        }
        vipPackage.setEnabled(!vipPackage.getEnabled());
        updateById(vipPackage);
        return vipPackage;
    }
}
