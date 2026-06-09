package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.dto.ChartItemResponse;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.dto.TrendItemResponse;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.UserAction;

import java.util.List;
import java.util.Map;

/**
 * 用户行为服务接口
 */
public interface UserActionService extends IService<UserAction> {

    /**
     * 切换点赞状态
     */
    boolean toggleLike(Long userId, Long galleryId, String ip, String userAgent);

    /**
     * 切换收藏状态
     */
    boolean toggleFavorite(Long userId, Long galleryId, String ip, String userAgent);

    /**
     * 记录下载
     */
    void recordDownload(Long userId, Long galleryId, String ip, String userAgent);

    /**
     * 检查是否已点赞
     */
    boolean hasLiked(Long userId, Long galleryId);

    /**
     * 检查是否已收藏
     */
    boolean hasFavorited(Long userId, Long galleryId);

    /**
     * 获取点赞最多的图库
     */
    List<TopGalleriesByAccess> getTopGalleriesByLikes(int limit);

    /**
     * 获取收藏最多的图库
     */
    List<TopGalleriesByAccess> getTopGalleriesByFavorites(int limit);

    /**
     * 获取点赞最多的图库（包含标题）
     */
    List<ChartItemResponse> getTopGalleriesByLikesWithTitles(int limit);

    /**
     * 获取收藏最多的图库（包含标题）
     */
    List<ChartItemResponse> getTopGalleriesByFavoritesWithTitles(int limit);

    /**
     * 统计用户收藏数
     */
    long countFavoritesByUser(Long userId);

    /**
     * 获取用户收藏的图库列表（分页）
     */
    IPage<Gallery> getFavoriteGalleries(Long userId, int page, int size);

    /**
     * 检查今天是否已经下载过指定图集
     */
    boolean hasDownloadedToday(Long userId, Long galleryId);

    /**
     * 记录卡密验证
     */
    void recordCardValidate(Long userId, String ip, String userAgent);

    /**
     * 记录卡密兑换
     */
    void recordCardRedeem(Long userId, String ip, String userAgent);

    /**
     * 获取最近30天的下载量趋势
     */
    List<Map<String, Object>> getDownloadsTrendChart();

    /**
     * 获取最近30天的点赞量趋势
     */
    List<Map<String, Object>> getLikesTrendChart();

    /**
     * 获取最近30天的收藏量趋势
     */
    List<Map<String, Object>> getFavoritesTrendChart();
}
