package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.ModelPrice;

import java.math.BigDecimal;
import java.util.List;

/**
 * 模型价格服务接口（简化版）
 */
public interface ModelPriceService extends IService<ModelPrice> {

    /**
     * 根据模型代码获取价格配置
     *
     * @param modelCode 模型代码
     * @return 价格配置
     */
    ModelPrice getByModelCode(String modelCode);

    /**
     * 获取模型价格
     *
     * @param modelCode 模型代码
     * @return 价格
     */
    BigDecimal getPrice(String modelCode);

    /**
     * 获取所有启用的模型价格
     *
     * @return 价格列表
     */
    List<ModelPrice> getAllEnabled();
}
