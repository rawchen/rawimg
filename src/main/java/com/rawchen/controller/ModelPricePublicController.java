package com.rawchen.controller;

import com.rawchen.entity.ModelPrice;
import com.rawchen.entity.R;
import com.rawchen.service.ModelPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 公开的模型价格查询接口（简化版）
 */
@RestController
@RequestMapping("/api/public/model-prices")
@RequiredArgsConstructor
public class ModelPricePublicController {

    private final ModelPriceService modelPriceService;

    /**
     * 获取所有启用的模型价格（前端显示用）
     */
    @GetMapping
    public R<List<Map<String, Object>>> getEnabledPrices() {
        List<ModelPrice> prices = modelPriceService.getAllEnabled();

        List<Map<String, Object>> result = prices.stream().map(price -> {
            Map<String, Object> map = new HashMap<>();
            map.put("modelCode", price.getModelCode());
            map.put("modelName", price.getModelName());
            map.put("provider", price.getProvider());
            map.put("price", price.getPrice());
            return map;
        }).collect(Collectors.toList());

        return R.ok(result);
    }

    /**
     * 获取指定模型的价格
     */
    @GetMapping("/price")
    public R<Map<String, Object>> getPrice(@RequestParam String modelCode) {
        BigDecimal price = modelPriceService.getPrice(modelCode);

        Map<String, Object> result = new HashMap<>();
        result.put("modelCode", modelCode);
        result.put("price", price);

        return R.ok(result);
    }
}
