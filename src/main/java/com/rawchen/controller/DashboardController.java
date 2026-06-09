package com.rawchen.controller;

import com.rawchen.dto.*;
import com.rawchen.entity.R;
import com.rawchen.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class DashboardController {

    private final GalleryService galleryService;
    private final CommentService commentService;
    private final UserService userService;
    private final AccessLogService accessLogService;
    private final UserActionService userActionService;

    @GetMapping("/dashboard/stats")
    public R<DashboardStatsResponse> getDashboardStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusDays(1);
        LocalDateTime thirtyDaysAgo = now.minusDays(30);

        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalGalleries(galleryService.countGalleries());
        stats.setTotalUsers(userService.countUsers());
        stats.setTotalVipUsers(userService.countActiveVipUsers());
        stats.setYesterdayGalleries(galleryService.countGalleriesSince(yesterday));
        stats.setYesterdayLikes(galleryService.sumLikesSince(yesterday));
        stats.setYesterdayComments(commentService.countCommentsSince(yesterday));
        stats.setYesterdayUsers(userService.countUsersSince(yesterday));
        stats.setUniqueVisitors30Days(accessLogService.countUniqueVisitorsSince(thirtyDaysAgo));
        stats.setTotalAccess30Days(accessLogService.countAccessSince(thirtyDaysAgo));

        return R.ok(stats);
    }

    @GetMapping("/dashboard/charts/likes")
    public R<List<ChartItemResponse>> getLikesChart() {
        List<ChartItemResponse> result = userActionService.getTopGalleriesByLikesWithTitles(10);
        return R.ok(result);
    }

    @GetMapping("/dashboard/charts/favorites")
    public R<List<ChartItemResponse>> getFavoritesChart() {
        List<ChartItemResponse> result = userActionService.getTopGalleriesByFavoritesWithTitles(10);
        return R.ok(result);
    }

    @GetMapping("/dashboard/charts/views")
    public R<List<ChartItemResponse>> getViewsChart() {
        List<ChartItemResponse> result = accessLogService.getTopGalleriesByAccessWithTitles(10);
        return R.ok(result);
    }

    @GetMapping("/dashboard/charts/trend")
    public R<List<TrendItemResponse>> getTrendChart() {
        List<Map<String, Object>> downloadsTrend = userActionService.getDownloadsTrendChart();
        List<Map<String, Object>> likesTrend = userActionService.getLikesTrendChart();
        List<Map<String, Object>> favoritesTrend = userActionService.getFavoritesTrendChart();

        // 合并下载量、点赞量、收藏量数据
        List<TrendItemResponse> result = mergeActionTrendData(downloadsTrend, likesTrend, favoritesTrend);
        return R.ok(result);
    }

    @GetMapping("/dashboard/charts/views-trend")
    public R<List<TrendItemResponse>> getViewsTrendChart() {
        List<Map<String, Object>> viewsTrend = accessLogService.getTrendChart();

        // 转换为 TrendItemResponse
        List<TrendItemResponse> result = new ArrayList<>();
        for (Map<String, Object> item : viewsTrend) {
            String date = String.valueOf(item.get("date"));
            Long views = ((Number) item.get("views")).longValue();
            Long uv = ((Number) item.get("uv")).longValue();
            TrendItemResponse trendItem = new TrendItemResponse();
            trendItem.setDate(date);
            trendItem.setViews(views);
            trendItem.setUv(uv);
            trendItem.setDownloads(0);
            trendItem.setLikes(0);
            trendItem.setFavorites(0);
            result.add(trendItem);
        }
        return R.ok(result);
    }

    private List<TrendItemResponse> mergeActionTrendData(List<Map<String, Object>> downloadsTrend,
                                                         List<Map<String, Object>> likesTrend,
                                                         List<Map<String, Object>> favoritesTrend) {
        // 使用 Map 来合并同一日期的数据
        Map<String, TrendItemResponse> mergedMap = new LinkedHashMap<>();

        // 合并下载量数据
        for (Map<String, Object> item : downloadsTrend) {
            String date = String.valueOf(item.get("date"));
            Long downloads = ((Number) item.get("downloads")).longValue();
            TrendItemResponse newItem = new TrendItemResponse();
            newItem.setDate(date);
            newItem.setViews(0);
            newItem.setDownloads(downloads);
            newItem.setLikes(0);
            newItem.setFavorites(0);
            mergedMap.put(date, newItem);
        }

        // 合并点赞量数据
        for (Map<String, Object> item : likesTrend) {
            String date = String.valueOf(item.get("date"));
            Long likes = ((Number) item.get("likes")).longValue();
            TrendItemResponse existing = mergedMap.get(date);
            if (existing == null) {
                TrendItemResponse newItem = new TrendItemResponse();
                newItem.setDate(date);
                newItem.setViews(0);
                newItem.setDownloads(0);
                newItem.setLikes(likes);
                newItem.setFavorites(0);
                mergedMap.put(date, newItem);
            } else {
                existing.setLikes(likes);
            }
        }

        // 合并收藏量数据
        for (Map<String, Object> item : favoritesTrend) {
            String date = String.valueOf(item.get("date"));
            Long favorites = ((Number) item.get("favorites")).longValue();
            TrendItemResponse existing = mergedMap.get(date);
            if (existing == null) {
                TrendItemResponse newItem = new TrendItemResponse();
                newItem.setDate(date);
                newItem.setViews(0);
                newItem.setDownloads(0);
                newItem.setLikes(0);
                newItem.setFavorites(favorites);
                mergedMap.put(date, newItem);
            } else {
                existing.setFavorites(favorites);
            }
        }

        List<TrendItemResponse> result = new ArrayList<>(mergedMap.values());
        // 按日期升序排序
        result.sort(Comparator.comparing(TrendItemResponse::getDate));
        return result;
    }
}
