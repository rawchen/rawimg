package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.dto.ChartItemResponse;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.dto.TrendItemResponse;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.UserAction;
import com.rawchen.mapper.GalleryMapper;
import com.rawchen.mapper.UserActionMapper;
import com.rawchen.service.AccessLogService;
import com.rawchen.service.UserActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 用户行为服务实现类
 */
@Service
@RequiredArgsConstructor
public class UserActionServiceImpl extends ServiceImpl<UserActionMapper, UserAction> implements UserActionService {

    private final GalleryMapper galleryMapper;
    private final AccessLogService accessLogService;

    @Override
    @Transactional
    public boolean toggleLike(Long userId, Long galleryId, String ip, String userAgent) {
        Gallery gallery = galleryMapper.selectById(galleryId);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }

        boolean exists = baseMapper.existsByUserIdAndGalleryIdAndType(userId, galleryId, "LIKE");

        if (exists) {
            LambdaQueryWrapper<UserAction> deleteWrapper = new LambdaQueryWrapper<>();
            deleteWrapper.eq(UserAction::getUserId, userId)
                        .eq(UserAction::getGalleryId, galleryId)
                        .eq(UserAction::getActionType, UserAction.ActionType.LIKE);
            remove(deleteWrapper);
            gallery.setLikeCount(Math.max(0, gallery.getLikeCount() - 1));
            galleryMapper.updateById(gallery);
            return false;
        } else {
            UserAction action = new UserAction();
            action.setUserId(userId);
            action.setGalleryId(galleryId);
            action.setActionType(UserAction.ActionType.LIKE);
            save(action);

            gallery.setLikeCount(gallery.getLikeCount() + 1);
            galleryMapper.updateById(gallery);
            return true;
        }
    }

    @Override
    @Transactional
    public boolean toggleFavorite(Long userId, Long galleryId, String ip, String userAgent) {
        Gallery gallery = galleryMapper.selectById(galleryId);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }

        boolean exists = baseMapper.existsByUserIdAndGalleryIdAndType(userId, galleryId, "FAVORITE");

        if (exists) {
            LambdaQueryWrapper<UserAction> deleteWrapper = new LambdaQueryWrapper<>();
            deleteWrapper.eq(UserAction::getUserId, userId)
                        .eq(UserAction::getGalleryId, galleryId)
                        .eq(UserAction::getActionType, UserAction.ActionType.FAVORITE);
            remove(deleteWrapper);
            gallery.setFavoriteCount(Math.max(0, gallery.getFavoriteCount() - 1));
            galleryMapper.updateById(gallery);
            return false;
        } else {
            UserAction action = new UserAction();
            action.setUserId(userId);
            action.setGalleryId(galleryId);
            action.setActionType(UserAction.ActionType.FAVORITE);
            save(action);
            gallery.setFavoriteCount(gallery.getFavoriteCount() + 1);
            galleryMapper.updateById(gallery);
            return true;
        }
    }

    @Override
    @Transactional
    public void recordDownload(Long userId, Long galleryId, String ip, String userAgent) {
        Gallery gallery = galleryMapper.selectById(galleryId);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }

        UserAction action = new UserAction();
        action.setUserId(userId);
        action.setGalleryId(galleryId);
        action.setActionType(UserAction.ActionType.DOWNLOAD);
        save(action);

        gallery.setDownloadCount(gallery.getDownloadCount() + 1);
        galleryMapper.updateById(gallery);

        // Log access
        accessLogService.logAccess(userId, galleryId, ip, userAgent, "DOWNLOAD");
    }

    @Override
    public boolean hasLiked(Long userId, Long galleryId) {
        return baseMapper.existsByUserIdAndGalleryIdAndType(userId, galleryId, "LIKE");
    }

    @Override
    public boolean hasFavorited(Long userId, Long galleryId) {
        return baseMapper.existsByUserIdAndGalleryIdAndType(userId, galleryId, "FAVORITE");
    }

    @Override
    public List<TopGalleriesByAccess> getTopGalleriesByLikes(int limit) {
        return baseMapper.findTopGalleriesByActionType("LIKE", limit);
    }

    @Override
    public List<TopGalleriesByAccess> getTopGalleriesByFavorites(int limit) {
        return baseMapper.findTopGalleriesByActionType("FAVORITE", limit);
    }

    @Override
    public List<ChartItemResponse> getTopGalleriesByLikesWithTitles(int limit) {
        return baseMapper.findTopGalleriesByLikesWithTitles(limit);
    }

    @Override
    public List<ChartItemResponse> getTopGalleriesByFavoritesWithTitles(int limit) {
        return baseMapper.findTopGalleriesByFavoritesWithTitles(limit);
    }

    @Override
    public long countFavoritesByUser(Long userId) {
        LambdaQueryWrapper<UserAction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserAction::getUserId, userId)
               .eq(UserAction::getActionType, UserAction.ActionType.FAVORITE);
        return count(wrapper);
    }

    @Override
    public IPage<Gallery> getFavoriteGalleries(Long userId, int page, int size) {
        Page<Gallery> pageParam = new Page<>(page, size);
        return baseMapper.findFavoriteGalleriesByUserId(pageParam, userId);
    }

    @Override
    public boolean hasDownloadedToday(Long userId, Long galleryId) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.plusDays(1).atStartOfDay();

        LambdaQueryWrapper<UserAction> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserAction::getUserId, userId)
               .eq(UserAction::getGalleryId, galleryId)
               .eq(UserAction::getActionType, UserAction.ActionType.DOWNLOAD)
               .ge(UserAction::getCreateTime, todayStart)
               .lt(UserAction::getCreateTime, todayEnd);

        return count(wrapper) > 0;
    }

    @Override
    public void recordCardValidate(Long userId, String ip, String userAgent) {
        UserAction action = new UserAction();
        action.setUserId(userId);
        action.setActionType(UserAction.ActionType.CARD_VALIDATE);
        save(action);
        accessLogService.logCardKeyAccess(userId, ip, userAgent, "CARD_VALIDATE");
    }

    @Override
    public void recordCardRedeem(Long userId, String ip, String userAgent) {
        UserAction action = new UserAction();
        action.setUserId(userId);
        action.setActionType(UserAction.ActionType.CARD_REDEEM);
        save(action);
        accessLogService.logCardKeyAccess(userId, ip, userAgent, "CARD_REDEEM");
    }

    @Override
    public List<Map<String, Object>> getDownloadsTrendChart() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(29).withHour(0).withMinute(0).withSecond(0);
        return baseMapper.findDownloadsTrendChart(startDate);
    }

    @Override
    public List<Map<String, Object>> getLikesTrendChart() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(29).withHour(0).withMinute(0).withSecond(0);
        return baseMapper.findLikesTrendChart(startDate);
    }

    @Override
    public List<Map<String, Object>> getFavoritesTrendChart() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(29).withHour(0).withMinute(0).withSecond(0);
        return baseMapper.findFavoritesTrendChart(startDate);
    }
}
