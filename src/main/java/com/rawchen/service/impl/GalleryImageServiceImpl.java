package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.GalleryImage;
import com.rawchen.mapper.GalleryImageMapper;
import com.rawchen.service.GalleryImageService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 图库图片服务实现类
 */
@Service
public class GalleryImageServiceImpl extends ServiceImpl<GalleryImageMapper, GalleryImage> implements GalleryImageService {

    @Override
    public List<GalleryImage> findByGalleryIdOrderBySortOrderAsc(Long galleryId) {
        LambdaQueryWrapper<GalleryImage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(GalleryImage::getGalleryId, galleryId)
               .orderByAsc(GalleryImage::getSortOrder);
        return list(wrapper);
    }

    @Override
    public void deleteByGalleryId(Long galleryId) {
        LambdaQueryWrapper<GalleryImage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(GalleryImage::getGalleryId, galleryId);
        remove(wrapper);
    }
}
