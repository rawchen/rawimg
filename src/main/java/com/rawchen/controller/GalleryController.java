package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.dto.*;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.GalleryImage;
import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.AccessLogService;
import com.rawchen.service.GalleryService;
import com.rawchen.service.UserActionService;
import com.rawchen.service.UserService;
import com.rawchen.util.IpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;
    private final UserActionService userActionService;
    private final UserService userService;
    private final AccessLogService accessLogService;

    @PostMapping("/public/galleries")
    public R<PageResponse<GalleryResponse>> getGalleries(
            @RequestBody GalleryQueryRequest request,
            @AuthenticationPrincipal SysUser user,
            HttpServletRequest httpServletRequest) {
        IPage<Gallery> galleries = galleryService.getGalleries(
                request.getPage() != null ? request.getPage() : 1,
                request.getSize() != null ? request.getSize() : 20,
                request.getSortBy() != null ? request.getSortBy() : "latest"
        );
        // Log access
        Long userId = user != null ? user.getId() : null;
        String ip = IpUtil.getClientIp(httpServletRequest);
        String userAgent = httpServletRequest.getHeader("User-Agent");
        accessLogService.logAccess(userId, null, ip, userAgent, "HOME");
        return R.ok(PageResponse.of(galleries, 
                request.getPage() != null ? request.getPage() : 1, 
                this::toGalleryResponse));
    }

    @GetMapping("/public/galleries/latest")
    public R<List<GalleryResponse>> getLatestGalleries(
            @RequestParam(defaultValue = "20") int limit) {
        List<Gallery> galleries = galleryService.getLatestGalleries(limit);
        List<GalleryResponse> response = galleries.stream()
                .map(this::toGalleryResponse)
                .collect(Collectors.toList());
        return R.ok(response);
    }

    @GetMapping("/public/galleries/like")
    public R<List<GalleryResponse>> getLikeGalleries(
            @RequestParam(defaultValue = "20") int limit) {
        List<Gallery> galleries = galleryService.getMostLikedGalleries(limit);
        List<GalleryResponse> response = galleries.stream()
                .map(this::toGalleryResponse)
                .collect(Collectors.toList());
        return R.ok(response);
    }

    @GetMapping("/public/galleries/hot")
    public R<List<GalleryResponse>> getHotGalleries(
            @RequestParam(defaultValue = "20") int limit) {
        List<Gallery> galleries = galleryService.getMostViewGalleries(limit);
        List<GalleryResponse> response = galleries.stream()
                .map(this::toGalleryResponse)
                .collect(Collectors.toList());
        return R.ok(response);
    }

    @GetMapping("/public/galleries/download")
    public R<List<GalleryResponse>> getMostDownloadedGalleries(
            @RequestParam(defaultValue = "20") int limit) {
        List<Gallery> galleries = galleryService.getMostDownloadedGalleries(limit);
        List<GalleryResponse> response = galleries.stream()
                .map(this::toGalleryResponse)
                .collect(Collectors.toList());
        return R.ok(response);
    }

    @GetMapping("/public/galleries/{id}/recommend")
    public R<List<GalleryResponse>> getRecommendedGalleries(@PathVariable Long id) {
        List<Gallery> galleries = galleryService.getRecommendedGalleries(id);
        List<GalleryResponse> response = galleries.stream()
                .map(this::toGalleryResponse)
                .collect(Collectors.toList());
        return R.ok(response);
    }

    @GetMapping("/public/galleries/{id}")
    public R<GalleryDetailResponse> getGalleryDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal SysUser user,
            HttpServletRequest request) {

        Long userId = user != null ? user.getId() : null;
        String ip = IpUtil.getClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        try {
            GalleryDetailResponse response = galleryService.getGalleryDetail(id, userId, ip, userAgent);
            // Check if user has liked/favorited
            if (userId != null) {
                response.setLiked(userActionService.hasLiked(userId, id));
                response.setFavorited(userActionService.hasFavorited(userId, id));
            }
            return R.ok(response);
        } catch (Exception e) {
            return R.fail(e.getMessage());
        }



    }

    @PostMapping("/admin/galleries")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Gallery> createGallery(
            @Valid @RequestBody GalleryCreateRequest request,
            @AuthenticationPrincipal SysUser user) {

        Gallery gallery = galleryService.createGallery(request, user.getId());
        return R.ok(gallery);
    }

    @PutMapping("/admin/galleries/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Gallery> updateGallery(
            @PathVariable Long id,
            @Valid @RequestBody GalleryCreateRequest request) {

        Gallery gallery = galleryService.updateGallery(id, request);
        return R.ok(gallery);
    }

    @PutMapping("/admin/galleries/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Gallery> updateGalleryStatus(
            @PathVariable Long id,
            @RequestParam Gallery.GalleryStatus status) {

        Gallery gallery = galleryService.updateGalleryStatus(id, status);
        return R.ok(gallery);
    }

    @DeleteMapping("/admin/galleries/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<Void> deleteGallery(@PathVariable Long id) {
        galleryService.deleteGallery(id);
        return R.ok();
    }

    @GetMapping("/admin/galleries")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<PageResponse<GalleryResponse>> getAllGalleries(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) Gallery.GalleryStatus status,
            @RequestParam(required = false) String sortBy) {

        IPage<Gallery> galleries = galleryService.getAllGalleries(page, size, title, status, sortBy);
        return R.ok(PageResponse.of(galleries, page, this::toGalleryResponse));
    }

    @GetMapping("/admin/galleries/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public R<GalleryEditResponse> getGalleryForEdit(@PathVariable Long id) {
        Gallery gallery = galleryService.getGalleryById(id);
        List<GalleryImage> images = galleryService.getGalleryImageList(id);
        return R.ok(GalleryEditResponse.fromWithImages(gallery, images));
    }

    @PostMapping("/galleries/{id}/like")
    public R<ToggleResponse> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal SysUser user,
            HttpServletRequest request) {

        if (user == null) {
            return R.unauthorized();
        }

        String ip = IpUtil.getClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        boolean liked = userActionService.toggleLike(user.getId(), id, ip, userAgent);
        accessLogService.logAccess(user.getId(), id, ip, userAgent, "LIKE");
        return R.ok(ToggleResponse.liked(liked));
    }

    @PostMapping("/galleries/{id}/favorite")
    public R<ToggleResponse> toggleFavorite(
            @PathVariable Long id,
            @AuthenticationPrincipal SysUser user,
            HttpServletRequest request) {

        if (user == null) {
            return R.unauthorized();
        }

        String ip = IpUtil.getClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        boolean favorited = userActionService.toggleFavorite(user.getId(), id, ip, userAgent);
        accessLogService.logAccess(user.getId(), id, ip, userAgent, "FAVORITE");
        return R.ok(ToggleResponse.favorited(favorited));
    }

    @PostMapping("/galleries/{id}/download")
    public R<DownloadResponse> download(
            @PathVariable Long id,
            @AuthenticationPrincipal SysUser user,
            HttpServletRequest request) {

        if (user == null) {
            return R.unauthorized();
        }

        // Check if user is VIP
        if (!userService.checkVip(user.getId())) {
            return R.forbidden("VIP会员可下载完整图集");
        }

        // Check if downloaded today
        boolean downloadedToday = userActionService.hasDownloadedToday(user.getId(), id);

        // If not downloaded today, check download limit
        if (!downloadedToday && !userService.checkDownloadLimit(user.getId())) {
            SysUser currentUser = userService.getById(user.getId());
            if (currentUser.getVipLevel() != null) {
                SysUser.VipLevel level = SysUser.VipLevel.fromCode(currentUser.getVipLevel());
                if (level != null) {
                    return R.forbidden("今日下载次数已用完，" + level.getName() + "会员每日可下载" + level.getDailyLimit() + "次");
                }
            }
            return R.forbidden("今日下载次数已达上限");
        }

        String ip = IpUtil.getClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        // Only record and increment if not downloaded today
        if (!downloadedToday) {
            userActionService.recordDownload(user.getId(), id, ip, userAgent);
            userService.incrementDownloadCount(user.getId());
        }

        Gallery gallery = galleryService.getGalleryById(id);
        return R.ok(new DownloadResponse(gallery.getDownloadLink()));
    }

    private GalleryResponse toGalleryResponse(Gallery gallery) {
        GalleryResponse response = new GalleryResponse();
        response.setId(gallery.getId());
        response.setTitle(gallery.getTitle());
        response.setDescription(gallery.getDescription());
        response.setCoverUrl(gallery.getCoverUrl());
        response.setStatus(gallery.getStatus().name());
        response.setViewCount(gallery.getViewCount());
        response.setLikeCount(gallery.getLikeCount());
        response.setFavoriteCount(gallery.getFavoriteCount());
        response.setCommentCount(gallery.getCommentCount());
        response.setDownloadCount(gallery.getDownloadCount());
        response.setCreateTime(gallery.getCreateTime());
        return response;
    }
}
