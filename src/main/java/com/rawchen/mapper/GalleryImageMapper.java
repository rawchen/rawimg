package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.GalleryImage;
import org.apache.ibatis.annotations.Mapper;

/**
 * 图片Mapper接口
 * 继承BaseMapper后，可直接使用以下方法替代原@Select注解：
 * 
 * 原方法: findByGalleryIdOrderBySortOrderAsc(galleryId)
 * 替换为: selectList(new LambdaQueryWrapper<GalleryImage>()
 *              .eq(GalleryImage::getGalleryId, galleryId)
 *              .orderByAsc(GalleryImage::getSortOrder))
 * 
 * 原方法: deleteByGalleryId(galleryId)
 * 替换为: delete(new LambdaQueryWrapper<GalleryImage>()
 *              .eq(GalleryImage::getGalleryId, galleryId))
 */
@Mapper
public interface GalleryImageMapper extends BaseMapper<GalleryImage> {
    // 简单查询已迁移至Service层使用LambdaQueryWrapper
    // BaseMapper提供的内置方法已足够使用
}
