package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.dto.MaterialCategoryCount;
import com.rawchen.entity.MaterialAsset;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 素材库素材Mapper
 */
@Mapper
public interface MaterialAssetMapper extends BaseMapper<MaterialAsset> {

    /**
     * 按「子库 + 分类」分组统计启用中的素材数量。
     * <p>
     * 由数据库完成聚合，只返回两列 + 计数，不加载素材明细（明细含多个长 URL 与
     * extra JSON，单行可达数百字节，全表拉取在远程 DB 上会耗时数秒）。
     * <p>
     * 注意：这里是手写 SQL，逻辑删除条件需要自己带上 {@code deleted = 0}。
     *
     * @param groupType   大类，可空
     * @param libraryType 子库，可空
     * @return 聚合结果列表
     */
    @Select({
            "<script>",
            "SELECT library_type, category_code, COUNT(*) AS total",
            "FROM material_asset",
            "WHERE deleted = 0 AND status = 1",
            "<if test='groupType != null and groupType != \"\"'> AND group_type = #{groupType}</if>",
            "<if test='libraryType != null and libraryType != \"\"'> AND library_type = #{libraryType}</if>",
            "GROUP BY library_type, category_code",
            "</script>"
    })
    List<MaterialCategoryCount> countGroupByCategory(@Param("groupType") String groupType,
                                                     @Param("libraryType") String libraryType);
}
