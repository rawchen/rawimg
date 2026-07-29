package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.ModelPriceResponse;
import com.rawchen.entity.ModelPrice;
import com.rawchen.entity.R;
import com.rawchen.service.ModelPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 管理后台 - 模型价格管理控制器（简化版）
 */
@RestController
@RequestMapping("/api/admin/model-prices")
@RequiredArgsConstructor
public class AdminModelPriceController {

    private final ModelPriceService modelPriceService;

    /**
     * 获取所有模型价格（分页）
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<IPage<ModelPriceResponse>> getAll(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {

        LambdaQueryWrapper<ModelPrice> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(ModelPrice::getSortOrder);

        IPage<ModelPrice> pricePage = modelPriceService.page(new Page<>(page, size), wrapper);

        IPage<ModelPriceResponse> responsePage = pricePage.convert(this::toResponse);
        return R.ok(responsePage);
    }

    /**
     * 获取启用的模型价格列表
     */
    @GetMapping("/enabled")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<List<ModelPriceResponse>> getEnabled() {
        List<ModelPrice> prices = modelPriceService.getAllEnabled();
        List<ModelPriceResponse> response = prices.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return R.ok(response);
    }

    /**
     * 获取单个模型价格
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<ModelPriceResponse> getById(@PathVariable Long id) {
        ModelPrice price = modelPriceService.getById(id);
        if (price == null) {
            return R.notFound("模型价格不存在");
        }
        return R.ok(toResponse(price));
    }

    /**
     * 创建模型价格
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public R<ModelPrice> create(@RequestBody ModelPrice price) {
        // 检查是否已存在相同的模型代码
        ModelPrice existing = modelPriceService.getByModelCode(price.getModelCode());
        if (existing != null) {
            return R.badRequest("该模型的价格配置已存在");
        }

        modelPriceService.save(price);
        return R.ok(price);
    }

    /**
     * 更新模型价格
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<ModelPrice> update(@PathVariable Long id, @RequestBody ModelPrice price) {
        ModelPrice existing = modelPriceService.getById(id);
        if (existing == null) {
            return R.notFound("模型价格不存在");
        }

        price.setId(id);
        modelPriceService.updateById(price);
        return R.ok(price);
    }

    /**
     * 删除模型价格
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> delete(@PathVariable Long id) {
        ModelPrice existing = modelPriceService.getById(id);
        if (existing == null) {
            return R.notFound("模型价格不存在");
        }

        modelPriceService.removeById(id);
        return R.ok();
    }

    /**
     * 切换启用状态
     */
    @PutMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public R<ModelPrice> toggle(@PathVariable Long id) {
        ModelPrice price = modelPriceService.getById(id);
        if (price == null) {
            return R.notFound("模型价格不存在");
        }

        price.setEnabled(!price.getEnabled());
        modelPriceService.updateById(price);
        return R.ok(price);
    }

    private ModelPriceResponse toResponse(ModelPrice price) {
        ModelPriceResponse response = new ModelPriceResponse();
        response.setId(price.getId());
        response.setModelCode(price.getModelCode());
        response.setModelName(price.getModelName());
        response.setProvider(price.getProvider());
        response.setPrice(price.getPrice());
        response.setDescription(price.getDescription());
        response.setEnabled(price.getEnabled());
        response.setSortOrder(price.getSortOrder());
        return response;
    }
}
