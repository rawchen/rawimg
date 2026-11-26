package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.rawchen.dto.MaterialCategoryCount;
import com.rawchen.entity.MaterialAsset;
import com.rawchen.entity.MaterialCategory;
import com.rawchen.mapper.MaterialAssetMapper;
import com.rawchen.mapper.MaterialCategoryMapper;
import com.rawchen.service.MaterialLibraryService;
import com.rawchen.vo.MaterialCategoryVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 素材库服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialLibraryServiceImpl extends ServiceImpl<MaterialAssetMapper, MaterialAsset> implements MaterialLibraryService {

    /**
     * 各分类素材数量缓存（key = groupType + "::" + libraryType）。
     * <p>
     * 素材数量变动不频繁（爬虫批量入库 / 后台手动增删），短 TTL 缓存可避免
     * 前台每次打开素材选择器都去打一次统计查询；写操作会主动失效缓存。
     */
    private static final Cache<String, Map<String, Long>> COUNT_CACHE = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofSeconds(60))
            .maximumSize(64)
            .build();

    private final MaterialAssetMapper materialAssetMapper;
    private final MaterialCategoryMapper materialCategoryMapper;

    @Override
    public List<MaterialCategoryVO> listCategories(String groupType, String libraryType, boolean includeDisabled) {
        LambdaQueryWrapper<MaterialCategory> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(groupType)) {
            wrapper.eq(MaterialCategory::getGroupType, groupType);
        }
        if (StringUtils.hasText(libraryType)) {
            wrapper.eq(MaterialCategory::getLibraryType, libraryType);
        }
        if (!includeDisabled) {
            wrapper.eq(MaterialCategory::getStatus, 1);
        }
        wrapper.orderByAsc(MaterialCategory::getSortOrder).orderByAsc(MaterialCategory::getId);
        List<MaterialCategory> categories = materialCategoryMapper.selectList(wrapper);
        if (categories.isEmpty()) {
            return Collections.emptyList();
        }

        // 统计每个分类下启用的素材数量
        Map<String, Long> countMap = countAssetsByCategory(groupType, libraryType);

        List<MaterialCategoryVO> result = new ArrayList<>(categories.size());
        for (MaterialCategory category : categories) {
            MaterialCategoryVO vo = new MaterialCategoryVO();
            vo.setGroupType(category.getGroupType());
            vo.setLibraryType(category.getLibraryType());
            vo.setCategoryCode(category.getCategoryCode());
            vo.setCategoryName(category.getCategoryName());
            vo.setCategoryNameOrigin(category.getCategoryNameOrigin());
            vo.setSortOrder(category.getSortOrder());
            vo.setStatus(category.getStatus());
            vo.setAssetCount(countMap.getOrDefault(countKey(category.getLibraryType(), category.getCategoryCode()), 0L));
            result.add(vo);
        }
        return result;
    }

    @Override
    public IPage<MaterialAsset> pageAssets(String groupType, String libraryType, String categoryCode,
                                            String keyword, Integer status, int page, int size) {
        LambdaQueryWrapper<MaterialAsset> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(groupType)) {
            wrapper.eq(MaterialAsset::getGroupType, groupType);
        }
        if (StringUtils.hasText(libraryType)) {
            wrapper.eq(MaterialAsset::getLibraryType, libraryType);
        }
        if (StringUtils.hasText(categoryCode)) {
            wrapper.eq(MaterialAsset::getCategoryCode, categoryCode);
        }
        if (status != null) {
            wrapper.eq(MaterialAsset::getStatus, status);
        }
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            wrapper.and(w -> w.like(MaterialAsset::getTitle, kw)
                    .or().like(MaterialAsset::getTitleOrigin, kw)
                    .or().like(MaterialAsset::getSourceId, kw));
        }
        wrapper.orderByAsc(MaterialAsset::getSortOrder).orderByAsc(MaterialAsset::getId);
        return materialAssetMapper.selectPage(new Page<>(page, size), wrapper);
    }

    @Override
    public MaterialAsset getById(Long id) {
        if (id == null) {
            return null;
        }
        return materialAssetMapper.selectById(id);
    }

    @Override
    public MaterialAsset getBySourceId(String libraryType, String sourceId) {
        if (!StringUtils.hasText(libraryType) || !StringUtils.hasText(sourceId)) {
            return null;
        }
        LambdaQueryWrapper<MaterialAsset> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MaterialAsset::getLibraryType, libraryType)
                .eq(MaterialAsset::getSourceId, sourceId)
                .last("LIMIT 1");
        return materialAssetMapper.selectOne(wrapper);
    }

    @Override
    public List<MaterialAsset> listByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        LambdaQueryWrapper<MaterialAsset> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(MaterialAsset::getId, ids);
        return materialAssetMapper.selectList(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int upsertBatch(List<MaterialAsset> assets) {
        if (assets == null || assets.isEmpty()) {
            return 0;
        }

        // 查询已存在的素材（按 libraryType + sourceId 判重）
        List<String> libraryTypes = assets.stream()
                .map(MaterialAsset::getLibraryType)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
        List<String> sourceIds = assets.stream()
                .map(MaterialAsset::getSourceId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());

        Map<String, MaterialAsset> existingMap = new HashMap<>();
        if (!libraryTypes.isEmpty() && !sourceIds.isEmpty()) {
            LambdaQueryWrapper<MaterialAsset> wrapper = new LambdaQueryWrapper<>();
            wrapper.in(MaterialAsset::getLibraryType, libraryTypes)
                    .in(MaterialAsset::getSourceId, sourceIds);
            for (MaterialAsset exist : materialAssetMapper.selectList(wrapper)) {
                existingMap.put(countKey(exist.getLibraryType(), exist.getSourceId()), exist);
            }
        }

        List<MaterialAsset> toInsert = new ArrayList<>();
        List<MaterialAsset> toUpdate = new ArrayList<>();
        for (MaterialAsset asset : assets) {
            MaterialAsset exist = existingMap.get(countKey(asset.getLibraryType(), asset.getSourceId()));
            if (exist != null) {
                asset.setId(exist.getId());
                toUpdate.add(asset);
            } else {
                toInsert.add(asset);
            }
        }

        if (!toInsert.isEmpty()) {
            saveBatch(toInsert);
        }
        if (!toUpdate.isEmpty()) {
            updateBatchById(toUpdate);
        }
        clearCountCache();
        log.info("素材批量入库完成: 新增 {} 条, 更新 {} 条", toInsert.size(), toUpdate.size());
        return toInsert.size();
    }

    @Override
    public boolean saveAsset(MaterialAsset asset) {
        if (asset == null) {
            return false;
        }
        if (asset.getStatus() == null) {
            asset.setStatus(1);
        }
        if (asset.getSortOrder() == null) {
            asset.setSortOrder(0);
        }
        boolean ok = saveOrUpdate(asset);
        if (ok) {
            clearCountCache();
        }
        return ok;
    }

    @Override
    public boolean updateAsset(MaterialAsset asset) {
        if (asset == null || asset.getId() == null) {
            return false;
        }
        boolean ok = materialAssetMapper.updateById(asset) > 0;
        if (ok) {
            clearCountCache();
        }
        return ok;
    }

    @Override
    public boolean removeAsset(Long id) {
        if (id == null) {
            return false;
        }
        boolean ok = materialAssetMapper.deleteById(id) > 0;
        if (ok) {
            clearCountCache();
        }
        return ok;
    }

    @Override
    public boolean saveCategory(MaterialCategory category) {
        if (category == null || !StringUtils.hasText(category.getCategoryCode())) {
            return false;
        }
        if (category.getStatus() == null) {
            category.setStatus(1);
        }
        if (category.getSortOrder() == null) {
            category.setSortOrder(0);
        }
        if (category.getId() == null) {
            return materialCategoryMapper.insert(category) > 0;
        }
        return materialCategoryMapper.updateById(category) > 0;
    }

    @Override
    public boolean removeCategory(Long id) {
        if (id == null) {
            return false;
        }
        return materialCategoryMapper.deleteById(id) > 0;
    }

    @Override
    public long countAssets(String libraryType, String categoryCode) {
        LambdaQueryWrapper<MaterialAsset> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(libraryType)) {
            wrapper.eq(MaterialAsset::getLibraryType, libraryType);
        }
        if (StringUtils.hasText(categoryCode)) {
            wrapper.eq(MaterialAsset::getCategoryCode, categoryCode);
        }
        wrapper.eq(MaterialAsset::getStatus, 1);
        return materialAssetMapper.selectCount(wrapper);
    }

    /**
     * 统计各分类素材数量（key = libraryType + "::" + categoryCode）
     * <p>
     * 由数据库直接 GROUP BY 聚合，不再把素材明细全量 selectList 到内存里数。
     * 素材明细每行含多个长 URL 与 extra JSON，全表拉取在远程 DB 上需数秒，
     * 而聚合只读索引列，耗时在毫秒级。
     */
    private Map<String, Long> countAssetsByCategory(String groupType, String libraryType) {
        // 归一化：空串视为未传，便于命中缓存与 SQL 条件
        String gt = StringUtils.hasText(groupType) ? groupType.trim() : null;
        String lt = StringUtils.hasText(libraryType) ? libraryType.trim() : null;
        String cacheKey = gt + "::" + lt;
        Map<String, Long> cached = COUNT_CACHE.getIfPresent(cacheKey);
        if (cached != null) {
            return cached;
        }

        List<MaterialCategoryCount> counts = materialAssetMapper.countGroupByCategory(gt, lt);
        Map<String, Long> countMap = new LinkedHashMap<>();
        for (MaterialCategoryCount count : counts) {
            countMap.put(countKey(count.getLibraryType(), count.getCategoryCode()),
                    count.getTotal() == null ? 0L : count.getTotal());
        }
        COUNT_CACHE.put(cacheKey, countMap);
        return countMap;
    }

    /**
     * 素材数量变化后清空统计缓存
     */
    private void clearCountCache() {
        COUNT_CACHE.invalidateAll();
    }

    private String countKey(String libraryType, String categoryCode) {
        return libraryType + "::" + categoryCode;
    }
}
