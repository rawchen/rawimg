package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.GalleryImage;

import java.util.List;

/**
 * 图库图片服务接口
 */
public interface GalleryImageService extends IService<GalleryImage> {

    /**
     * 根据图库ID获取图片列表（按排序）
     */
    List<GalleryImage> findByGalleryIdOrderBySortOrderAsc(Long galleryId);

    /**
     * 根据图库ID删除图片
     */
    void deleteByGalleryId(Long galleryId);
}
