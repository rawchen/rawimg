package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.MaterialAsset;
import com.rawchen.entity.MaterialCategory;
import com.rawchen.vo.MaterialCategoryVO;

import java.util.List;

/**
 * 素材库服务接口
 */
public interface MaterialLibraryService {

    /**
     * 查询分类列表
     *
     * @param groupType   大类(portrait/costume/pose)，为空则查全部
     * @param libraryType 子库，为空则查全部
     * @param includeDisabled 是否包含停用分类
     * @return 分类列表（带素材数量）
     */
    List<MaterialCategoryVO> listCategories(String groupType, String libraryType, boolean includeDisabled);

    /**
     * 分页查询素材
     */
    IPage<MaterialAsset> pageAssets(String groupType, String libraryType, String categoryCode,
                                     String keyword, Integer status, int page, int size);

    /**
     * 按ID查询素材
     */
    MaterialAsset getById(Long id);

    /**
     * 按来源ID查询素材
     */
    MaterialAsset getBySourceId(String libraryType, String sourceId);

    /**
     * 批量按ID查询素材
     */
    List<MaterialAsset> listByIds(List<Long> ids);

    /**
     * 批量新增或更新（按 libraryType + sourceId 判重）
     *
     * @return 新增条数
     */
    int upsertBatch(List<MaterialAsset> assets);

    /**
     * 新增或更新素材（id 为空则新增）
     */
    boolean saveAsset(MaterialAsset asset);

    /**
     * 更新素材
     */
    boolean updateAsset(MaterialAsset asset);

    /**
     * 删除素材（逻辑删除）
     */
    boolean removeAsset(Long id);

    /**
     * 新增或更新分类
     */
    boolean saveCategory(MaterialCategory category);

    /**
     * 删除分类（逻辑删除）
     */
    boolean removeCategory(Long id);

    /**
     * 统计分类下的素材数量
     */
    long countAssets(String libraryType, String categoryCode);
}
