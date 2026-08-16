package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.RechargePackage;
import com.rawchen.mapper.RechargePackageMapper;
import com.rawchen.service.RechargePackageService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 充值套餐服务实现
 */
@Service
public class RechargePackageServiceImpl extends ServiceImpl<RechargePackageMapper, RechargePackage> implements RechargePackageService {

    @Override
    public List<RechargePackage> getEnabledPackages() {
        LambdaQueryWrapper<RechargePackage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RechargePackage::getEnabled, true)
                .orderByAsc(RechargePackage::getSortOrder);
        return list(wrapper);
    }
}
