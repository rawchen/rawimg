package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.ModelPrice;
import com.rawchen.mapper.ModelPriceMapper;
import com.rawchen.service.ModelPriceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 模型价格服务实现（简化版）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModelPriceServiceImpl extends ServiceImpl<ModelPriceMapper, ModelPrice> implements ModelPriceService {

    @Override
    public ModelPrice getByModelCode(String modelCode) {
        LambdaQueryWrapper<ModelPrice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ModelPrice::getModelCode, modelCode)
               .eq(ModelPrice::getEnabled, true);
        return getOne(wrapper);
    }

    @Override
    public BigDecimal getPrice(String modelCode) {
        ModelPrice price = getByModelCode(modelCode);
        if (price == null) {
            log.warn("未找到模型价格配置: modelCode={}", modelCode);
            return BigDecimal.ZERO;
        }
        return price.getPrice();
    }

    @Override
    public List<ModelPrice> getAllEnabled() {
        LambdaQueryWrapper<ModelPrice> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ModelPrice::getEnabled, true)
               .orderByAsc(ModelPrice::getSortOrder);
        return list(wrapper);
    }
}
