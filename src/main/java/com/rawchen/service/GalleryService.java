package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.GalleryCreateRequest;
import com.rawchen.dto.GalleryDetailResponse;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.GalleryImage;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 图库服务接口
 */
public interface GalleryService extends IService<Gallery> {

    /**
     * 获取图库列表（分页）
     */
    IPage<Gallery> getGalleries(int page, int size, String sortBy);

    /**
     * 获取最新图库
     */
    List<Gallery> getLatestGalleries(int limit);

    /**
     * 获取最多点赞的图库
     */
    List<Gallery> getMostLikedGalleries(int limit);

    /**
     * 获取最多浏览的图库
     */
    List<Gallery> getMostViewGalleries(int limit);

    /**
     * 获取最多下载的图库
     */
    List<Gallery> getMostDownloadedGalleries(int limit);

    /**
     * 获取图库详情
     */
    GalleryDetailResponse getGalleryDetail(Long id, Long userId, String ip, String userAgent);

    /**
     * 创建图库
     */
    Gallery createGallery(GalleryCreateRequest request, Long userId);

    /**
     * 更新图库
     */
    Gallery updateGallery(Long id, GalleryCreateRequest request);

    /**
     * 更新图库状态
     */
    Gallery updateGalleryStatus(Long id, Gallery.GalleryStatus status);

    /**
     * 删除图库
     */
    void deleteGallery(Long id);

    /**
     * 根据ID获取图库
     */
    Gallery getGalleryById(Long id);

    /**
     * 获取图库图片URL列表
     */
    List<String> getGalleryImages(Long galleryId);

    /**
     * 获取图库图片列表（包含完整信息）
     */
    List<GalleryImage> getGalleryImageList(Long galleryId);

    /**
     * 获取所有图库（管理后台）
     */
    IPage<Gallery> getAllGalleries(int page, int size, String title, Gallery.GalleryStatus status, String sortBy);

    /**
     * 获取预览限制
     */
    int getPreviewLimit();

    /**
     * 统计图库总数
     */
    long countGalleries();

    /**
     * 统计已发布图库数
     */
    long countPublishedGalleries();

    /**
     * 统计指定时间以来的图库数
     */
    long countGalleriesSince(LocalDateTime startTime);

    /**
     * 统计指定时间以来的点赞总数
     */
    long sumLikesSince(LocalDateTime startTime);

    /**
     * 统计指定时间以来的评论总数
     */
    long sumCommentsSince(LocalDateTime startTime);

    /**
     * 获取点赞最多的图库
     */
    List<TopGalleriesByAccess> getTopGalleriesByLikes(int limit);

    /**
     * 获取浏览最多的图库
     */
    List<Gallery> getTopGalleriesByViews(int limit);

    /**
     * 获取推荐图库
     * @param currentId 当前图库ID
     * @return 6个推荐图库
     */
    List<Gallery> getRecommendedGalleries(Long currentId);

    /**
     * 获取推荐图库（备份推荐算法）
     * @param currentId 当前图库ID
     * @return 6个推荐图库
     */
    List<Gallery> getRecommendedGalleriesBack(Long currentId);
}
