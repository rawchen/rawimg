package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.entity.VipPackage;
import com.rawchen.service.VipPackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * VIP套餐管理Controller
 */
@RestController
@RequestMapping("/api/admin/vip-packages")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminVipPackageController {

    private final VipPackageService vipPackageService;

    /**
     * 获取所有套餐列表
     */
    @GetMapping
    public R<List<Map<String, Object>>> getAllPackages() {
        List<VipPackage> packages = vipPackageService.getAllPackages();
        List<Map<String, Object>> result = packages.stream()
                .map(this::toPackageResponse)
                .collect(Collectors.toList());
        return R.ok(result);
    }

    /**
     * 创建套餐
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public R<Map<String, Object>> createPackage(@RequestBody VipPackage vipPackage) {
        try {
            VipPackage created = vipPackageService.createPackage(vipPackage);
            return R.ok(toPackageResponse(created));
        } catch (Exception e) {
            return R.badRequest("创建套餐失败：" + e.getMessage());
        }
    }

    /**
     * 更新套餐
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Map<String, Object>> updatePackage(@PathVariable Long id, @RequestBody VipPackage vipPackage) {
        try {
            VipPackage updated = vipPackageService.updatePackage(id, vipPackage);
            return R.ok(toPackageResponse(updated));
        } catch (Exception e) {
            return R.badRequest("更新套餐失败：" + e.getMessage());
        }
    }

    /**
     * 删除套餐
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> deletePackage(@PathVariable Long id) {
        try {
            boolean success = vipPackageService.deletePackage(id);
            if (success) {
                return R.ok(null);
            } else {
                return R.notFound("套餐不存在");
            }
        } catch (Exception e) {
            return R.badRequest("删除套餐失败：" + e.getMessage());
        }
    }

    /**
     * 切换启用状态
     */
    @PutMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Map<String, Object>> toggleEnabled(@PathVariable Long id) {
        try {
            VipPackage updated = vipPackageService.toggleEnabled(id);
            return R.ok(toPackageResponse(updated));
        } catch (Exception e) {
            return R.badRequest("切换状态失败：" + e.getMessage());
        }
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
        result.put("enabled", pkg.getEnabled());
        result.put("purchaseUrl", pkg.getPurchaseUrl());
        result.put("description", pkg.getDescription());
        result.put("createTime", pkg.getCreateTime() != null ? pkg.getCreateTime().toString() : null);
        result.put("updateTime", pkg.getUpdateTime() != null ? pkg.getUpdateTime().toString() : null);
        return result;
    }
}
