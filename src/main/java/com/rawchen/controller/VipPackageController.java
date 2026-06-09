package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.entity.VipPackage;
import com.rawchen.service.VipPackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * VIP套餐公开接口Controller
 */
@RestController
@RequestMapping("/api/public/vip-packages")
@RequiredArgsConstructor
public class VipPackageController {

    private final VipPackageService vipPackageService;

    /**
     * 获取启用的套餐列表（公开接口）
     */
    @GetMapping
    public R<List<Map<String, Object>>> getEnabledPackages() {
        List<VipPackage> packages = vipPackageService.getEnabledPackages();
        List<Map<String, Object>> result = packages.stream()
                .map(this::toPackageResponse)
                .collect(Collectors.toList());
        return R.ok(result);
    }

    /**
     * 转换为响应Map
     */
    private Map<String, Object> toPackageResponse(VipPackage pkg) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", pkg.getId());
        result.put("packageCode", pkg.getPackageCode());
        result.put("packageName", pkg.getPackageName());
        result.put("days", pkg.getDays());
        result.put("dailyDownloadCount", pkg.getDailyDownloadCount());
        result.put("price", pkg.getPrice());
        result.put("sortOrder", pkg.getSortOrder());
        result.put("popular", pkg.getPopular());
        result.put("purchaseUrl", pkg.getPurchaseUrl());
        result.put("description", pkg.getDescription());
        return result;
    }
}
