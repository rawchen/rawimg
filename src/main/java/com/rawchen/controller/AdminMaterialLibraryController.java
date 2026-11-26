package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.dto.MaterialAssetDTO;
import com.rawchen.dto.MaterialCategoryDTO;
import com.rawchen.dto.PageResponse;
import com.rawchen.entity.MaterialAsset;
import com.rawchen.entity.MaterialCategory;
import com.rawchen.entity.R;
import com.rawchen.service.MaterialLibraryService;
import com.rawchen.vo.MaterialCategoryVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 素材库后台管理控制器
 * <p>
 * 用于维护人物素材库（人脸/造型）、服装素材库（写实/动漫）、姿态库的素材与分类，
 * 同时提供爬虫批量入库接口 /api/admin/material-library/import。
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/material-library")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminMaterialLibraryController {

    private final MaterialLibraryService materialLibraryService;

    /**
     * 素材分页列表
     */
    @GetMapping("/assets")
    public R<PageResponse<MaterialAsset>> listAssets(
            @RequestParam(value = "groupType", required = false) String groupType,
            @RequestParam(value = "libraryType", required = false) String libraryType,
            @RequestParam(value = "categoryCode", required = false) String categoryCode,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "20") Integer size) {

        int safeSize = size == null || size <= 0 ? 20 : Math.min(size, 200);
        int safePage = page == null || page <= 0 ? 1 : page;

        IPage<MaterialAsset> result = materialLibraryService.pageAssets(
                groupType, libraryType, categoryCode, keyword, status, safePage, safeSize);
        return R.ok(PageResponse.of(result, safePage));
    }

    /**
     * 素材详情
     */
    @GetMapping("/asset/{id}")
    public R<MaterialAsset> getAsset(@PathVariable("id") Long id) {
        MaterialAsset asset = materialLibraryService.getById(id);
        if (asset == null) {
            return R.notFound("素材不存在");
        }
        return R.ok(asset);
    }

    /**
     * 新增素材
     */
    @PostMapping("/asset")
    public R<MaterialAsset> createAsset(@RequestBody MaterialAssetDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.getSourceId()) || !StringUtils.hasText(dto.getLibraryType())) {
            return R.badRequest("libraryType 与 sourceId 不能为空");
        }
        MaterialAsset exist = materialLibraryService.getBySourceId(dto.getLibraryType(), dto.getSourceId());
        if (exist != null) {
            return R.fail("素材已存在：" + dto.getSourceId());
        }
        MaterialAsset asset = toEntity(dto, null);
        asset.setId(null);
        materialLibraryService.saveAsset(asset);
        return R.ok(asset);
    }

    /**
     * 修改素材
     */
    @PutMapping("/asset/{id}")
    public R<MaterialAsset> updateAsset(@PathVariable("id") Long id, @RequestBody MaterialAssetDTO dto) {
        MaterialAsset exist = materialLibraryService.getById(id);
        if (exist == null) {
            return R.notFound("素材不存在");
        }
        MaterialAsset asset = toEntity(dto, id);
        materialLibraryService.updateAsset(asset);
        return R.ok(asset);
    }

    /**
     * 启用/停用素材
     */
    @PutMapping("/asset/{id}/status")
    public R<Void> updateAssetStatus(@PathVariable("id") Long id, @RequestParam Integer status) {
        MaterialAsset exist = materialLibraryService.getById(id);
        if (exist == null) {
            return R.notFound("素材不存在");
        }
        exist.setStatus(status);
        materialLibraryService.updateAsset(exist);
        return R.ok();
    }

    /**
     * 删除素材
     */
    @DeleteMapping("/asset/{id}")
    public R<Void> deleteAsset(@PathVariable("id") Long id) {
        materialLibraryService.removeAsset(id);
        return R.ok();
    }

    /**
     * 批量删除素材
     */
    @DeleteMapping("/asset/batch")
    public R<Void> deleteAssets(@RequestBody Long[] ids) {
        if (ids == null) {
            return R.ok();
        }
        for (Long id : ids) {
            materialLibraryService.removeAsset(id);
        }
        return R.ok();
    }

    /**
     * 分类列表（含停用）
     */
    @GetMapping("/categories")
    public R<List<MaterialCategoryVO>> categories(
            @RequestParam(value = "groupType", required = false) String groupType,
            @RequestParam(value = "libraryType", required = false) String libraryType) {
        return R.ok(materialLibraryService.listCategories(groupType, libraryType, true));
    }

    /**
     * 新增/更新分类
     */
    @PostMapping("/category")
    public R<MaterialCategory> saveCategory(@RequestBody MaterialCategoryDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.getLibraryType()) || !StringUtils.hasText(dto.getCategoryCode())) {
            return R.badRequest("libraryType 与 categoryCode 不能为空");
        }
        if (!StringUtils.hasText(dto.getCategoryName())) {
            return R.badRequest("分类名称不能为空");
        }
        MaterialCategory category = new MaterialCategory();
        category.setId(dto.getId());
        category.setGroupType(dto.getGroupType());
        category.setLibraryType(dto.getLibraryType());
        category.setCategoryCode(dto.getCategoryCode());
        category.setCategoryName(dto.getCategoryName());
        category.setCategoryNameOrigin(dto.getCategoryNameOrigin());
        category.setSortOrder(dto.getSortOrder());
        category.setStatus(dto.getStatus());
        materialLibraryService.saveCategory(category);
        return R.ok(category);
    }

    /**
     * 删除分类
     */
    @DeleteMapping("/category/{id}")
    public R<Void> deleteCategory(@PathVariable("id") Long id) {
        materialLibraryService.removeCategory(id);
        return R.ok();
    }

    /**
     * 批量导入素材（爬虫入库接口）
     */
    @PostMapping("/import")
    public R<Map<String, Object>> importAssets(@RequestBody List<MaterialAssetDTO> list) {
        if (list == null || list.isEmpty()) {
            return R.badRequest("导入数据为空");
        }

        // 回填分类中文名
        Map<String, String> categoryNameMap = materialLibraryService
                .listCategories(null, null, true)
                .stream()
                .collect(Collectors.toMap(
                        vo -> vo.getLibraryType() + "::" + vo.getCategoryCode(),
                        MaterialCategoryVO::getCategoryName,
                        (a, b) -> a));

        List<MaterialAsset> assets = new ArrayList<>(list.size());
        for (MaterialAssetDTO dto : list) {
            if (dto == null || !StringUtils.hasText(dto.getLibraryType()) || !StringUtils.hasText(dto.getSourceId())) {
                continue;
            }
            MaterialAsset asset = toEntity(dto, null);
            if (!StringUtils.hasText(asset.getCategoryName())) {
                asset.setCategoryName(categoryNameMap.get(asset.getLibraryType() + "::" + asset.getCategoryCode()));
            }
            assets.add(asset);
        }

        int inserted = materialLibraryService.upsertBatch(assets);

        Map<String, Object> data = new HashMap<>();
        data.put("total", assets.size());
        data.put("inserted", inserted);
        data.put("updated", assets.size() - inserted);
        return R.ok(data);
    }

    /**
     * DTO -> Entity
     */
    private MaterialAsset toEntity(MaterialAssetDTO dto, Long id) {
        MaterialAsset asset = new MaterialAsset();
        if (id != null) {
            asset.setId(id);
        }
        asset.setGroupType(dto.getGroupType());
        asset.setLibraryType(dto.getLibraryType());
        asset.setCategoryCode(dto.getCategoryCode());
        asset.setCategoryName(dto.getCategoryName());
        asset.setSourceId(dto.getSourceId());
        asset.setTitle(dto.getTitle());
        asset.setTitleOrigin(dto.getTitleOrigin());
        asset.setThumbUrl(dto.getThumbUrl());
        asset.setPreviewUrl(dto.getPreviewUrl());
        asset.setFullUrl(dto.getFullUrl());
        asset.setWidth(dto.getWidth());
        asset.setHeight(dto.getHeight());
        asset.setExtra(dto.getExtra());
        asset.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        asset.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        return asset;
    }
}
