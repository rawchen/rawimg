package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.entity.SysConfig;
import com.rawchen.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;

    @GetMapping("/public/config")
    public R<Map<String, String>> getPublicConfig() {
        Map<String, String> config = new HashMap<>();
        config.put("siteTitle", configService.getConfigValue("site_title", "LensLog"));
        config.put("siteDescription", configService.getConfigValue("site_description", "A beautiful image gallery platform"));
        config.put("freePreviewLimit", configService.getConfigValue("free_preview_limit", "3"));
        config.put("cardKeyPurchaseUrl", configService.getConfigValue("card_key_purchase_url", ""));
        return R.ok(config);
    }

    @GetMapping("/admin/config")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<List<SysConfig>> getAllConfigs() {
        return R.ok(configService.getAllConfigs());
    }

    @GetMapping("/admin/config/{key}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Map<String, String>> getConfig(@PathVariable String key) {
        String value = configService.getConfigValue(key);
        Map<String, String> result = new HashMap<>();
        result.put("key", key);
        result.put("value", value);
        return R.ok(result);
    }

    @PostMapping("/admin/config")
    @PreAuthorize("hasRole('ADMIN')")
    public R<SysConfig> setConfig(@RequestBody Map<String, String> request) {
        String key = request.get("key");
        String value = request.get("value");
        String type = request.get("type");
        String description = request.get("description");

        SysConfig config = configService.setConfig(key, value, type, description);
        return R.ok(config);
    }

    @DeleteMapping("/admin/config/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public R<Void> deleteConfig(@PathVariable Long id) {
        configService.deleteConfig(id);
        return R.ok();
    }
}
