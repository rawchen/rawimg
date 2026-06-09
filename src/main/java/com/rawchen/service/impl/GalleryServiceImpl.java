package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.dto.GalleryCreateRequest;
import com.rawchen.dto.GalleryDetailResponse;
import com.rawchen.dto.GalleryImageDto;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.GalleryImage;
import com.rawchen.mapper.GalleryMapper;
import com.rawchen.service.AccessLogService;
import com.rawchen.service.ConfigService;
import com.rawchen.service.GalleryImageService;
import com.rawchen.service.GalleryService;
import com.rawchen.service.UserActionService;
import com.rawchen.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 图库服务实现类
 */
@Service
@RequiredArgsConstructor
public class GalleryServiceImpl extends ServiceImpl<GalleryMapper, Gallery> implements GalleryService {

    private final GalleryImageService galleryImageService;
    private final UserService userService;
    private final UserActionService userActionService;
    private final AccessLogService accessLogService;
    private final ConfigService configService;

    @Override
    public IPage<Gallery> getGalleries(int page, int size, String sortBy) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED);

        switch (sortBy) {
            case "like":
                wrapper.orderByDesc(Gallery::getLikeCount);
                break;
            case "hot":
                wrapper.orderByDesc(Gallery::getCommentCount);
                break;
            case "down":
                wrapper.orderByDesc(Gallery::getDownloadCount);
                break;
            default:
                wrapper.orderByDesc(Gallery::getCreateTime);
        }

        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public List<Gallery> getLatestGalleries(int limit) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .orderByDesc(Gallery::getCreateTime)
               .last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    public List<Gallery> getMostLikedGalleries(int limit) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .orderByDesc(Gallery::getLikeCount)
               .last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    public List<Gallery> getMostViewGalleries(int limit) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .orderByDesc(Gallery::getViewCount)
               .last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    public List<Gallery> getMostDownloadedGalleries(int limit) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .orderByDesc(Gallery::getDownloadCount)
               .last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    public GalleryDetailResponse getGalleryDetail(Long id, Long userId, String ip, String userAgent) {
        Gallery gallery = getById(id);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }

        if (gallery.getStatus() != Gallery.GalleryStatus.PUBLISHED) {
            throw new RuntimeException("Gallery not found");
        }

        // Increment view count
        gallery.setViewCount(gallery.getViewCount() + 1);
        updateById(gallery);

        // Log access
        accessLogService.logAccess(userId, id, ip, userAgent, "VIEW");

        // Get preview limit
        int previewLimit = getPreviewLimit();

        // Check VIP status
        boolean vip = userId != null && userService.checkVip(userId);

        // Prepare response
        GalleryDetailResponse response = new GalleryDetailResponse();
        response.setId(gallery.getId());
        response.setTitle(gallery.getTitle());
        response.setDescription(gallery.getDescription());
        response.setCoverUrl(gallery.getCoverUrl());
        response.setContent(gallery.getContent());
        response.setViewCount(gallery.getViewCount());
        response.setLikeCount(gallery.getLikeCount());
        response.setFavoriteCount(gallery.getFavoriteCount());
        response.setCommentCount(gallery.getCommentCount());
        response.setDownloadCount(gallery.getDownloadCount());
        response.setCreateTime(gallery.getCreateTime());
        response.setVip(vip);
        response.setPreviewLimit(previewLimit);

        // Get images
        List<GalleryImage> images = galleryImageService.findByGalleryIdOrderBySortOrderAsc(id);
        response.setTotalImageCount(images.size());

        if (vip) {
            response.setImages(images.stream().map(this::toImageResponse).collect(Collectors.toList()));
            response.setLocked(false);
        } else {
            List<GalleryImage> previewImages = images.stream()
                    .limit(previewLimit)
                    .collect(Collectors.toList());
            response.setImages(previewImages.stream().map(this::toImageResponse).collect(Collectors.toList()));
            response.setLocked(true);
        }

        return response;
    }

    @Override
    @Transactional
    public Gallery createGallery(GalleryCreateRequest request, Long userId) {
        Gallery gallery = new Gallery();
        gallery.setTitle(request.getTitle());
        gallery.setDescription(request.getDescription());
        gallery.setCoverUrl(request.getCoverUrl());
        gallery.setContent(request.getContent());
        // 默认为 PUBLISHED，除非请求中指定了 DRAFT
        if (request.getStatus() != null && "DRAFT".equalsIgnoreCase(request.getStatus())) {
            gallery.setStatus(Gallery.GalleryStatus.DRAFT);
        } else {
            gallery.setStatus(Gallery.GalleryStatus.PUBLISHED);
        }
        gallery.setDownloadLink(request.getDownloadLink());

        save(gallery);

        // Save images
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            for (int i = 0; i < request.getImages().size(); i++) {
                com.rawchen.dto.GalleryImageDto imageDto = request.getImages().get(i);
                GalleryImage image = new GalleryImage();
                image.setGalleryId(gallery.getId());
                image.setUrl(imageDto.getUrl());
                image.setSortOrder(imageDto.getSortOrder() != null ? imageDto.getSortOrder() : i);
                image.setIsPreview(imageDto.getIsPreview() != null ? imageDto.getIsPreview() : true);
                if (imageDto.getDescription() != null) {
                    image.setDescription(imageDto.getDescription());
                }
                galleryImageService.save(image);
            }
        }

        return gallery;
    }

    @Override
    @Transactional
    public Gallery updateGallery(Long id, GalleryCreateRequest request) {
        Gallery gallery = getById(id);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }

        gallery.setTitle(request.getTitle());
        gallery.setDescription(request.getDescription());
        gallery.setCoverUrl(request.getCoverUrl());
        gallery.setContent(request.getContent());
        gallery.setDownloadLink(request.getDownloadLink());

        updateById(gallery);

        // Update images - 原位增删改
        if (request.getImages() != null) {
            for (GalleryImageDto imageDto : request.getImages()) {
                String operation = imageDto.getOperation();

                if ("delete".equals(operation)) {
                    // 删除图片
                    if (imageDto.getId() != null) {
                        galleryImageService.removeById(imageDto.getId());
                    }
                } else if ("update".equals(operation)) {
                    // 更新已有图片（主要是排序顺序）
                    if (imageDto.getId() != null) {
                        GalleryImage existingImage = galleryImageService.getById(imageDto.getId());
                        if (existingImage != null) {
                            existingImage.setSortOrder(imageDto.getSortOrder());
                            if (imageDto.getDescription() != null) {
                                existingImage.setDescription(imageDto.getDescription());
                            }
                            galleryImageService.updateById(existingImage);
                        }
                    }
                } else if ("create".equals(operation)) {
                    // 新增图片
                    GalleryImage newImage = new GalleryImage();
                    newImage.setGalleryId(gallery.getId());
                    newImage.setUrl(imageDto.getUrl());
                    newImage.setThumbnailUrl(imageDto.getUrl());
                    newImage.setSortOrder(imageDto.getSortOrder());
                    newImage.setIsPreview(imageDto.getIsPreview() != null ? imageDto.getIsPreview() : true);
                    if (imageDto.getDescription() != null) {
                        newImage.setDescription(imageDto.getDescription());
                    }
                    galleryImageService.save(newImage);
                }
            }
        }

        return gallery;
    }

    @Override
    @Transactional
    public Gallery updateGalleryStatus(Long id, Gallery.GalleryStatus status) {
        Gallery gallery = getById(id);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }
        gallery.setStatus(status);
        updateById(gallery);
        return gallery;
    }

    @Override
    @Transactional
    public void deleteGallery(Long id) {
        galleryImageService.deleteByGalleryId(id);
        removeById(id);
    }

    @Override
    public Gallery getGalleryById(Long id) {
        Gallery gallery = getById(id);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }
        return gallery;
    }

    @Override
    public List<String> getGalleryImages(Long galleryId) {
        List<GalleryImage> images = galleryImageService.findByGalleryIdOrderBySortOrderAsc(galleryId);
        return images.stream()
                .map(GalleryImage::getUrl)
                .collect(Collectors.toList());
    }

    @Override
    public List<GalleryImage> getGalleryImageList(Long galleryId) {
        return galleryImageService.findByGalleryIdOrderBySortOrderAsc(galleryId);
    }

    @Override
    public IPage<Gallery> getAllGalleries(int page, int size, String title, Gallery.GalleryStatus status, String sortBy) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.isNotBlank(title)) {
            wrapper.like(Gallery::getTitle, title);
        }
        if (status != null) {
            wrapper.eq(Gallery::getStatus, status);
        }
        // 根据排序类型设置排序
        if ("hot".equals(sortBy)) {
            wrapper.orderByDesc(Gallery::getViewCount);
        } else if ("like".equals(sortBy)) {
            wrapper.orderByDesc(Gallery::getLikeCount);
        } else if ("down".equals(sortBy)) {
            wrapper.orderByDesc(Gallery::getDownloadCount);
        } else {
            // 默认按创建时间降序
            wrapper.orderByDesc(Gallery::getCreateTime);
        }
        return page(new Page<>(page, size), wrapper);
    }

    @Override
    public int getPreviewLimit() {
        return configService.getConfigIntValue("free_preview_limit", 3);
    }

    @Override
    public long countGalleries() {
        return count();
    }

    @Override
    public long countPublishedGalleries() {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED);
        return count(wrapper);
    }

    @Override
    public long countGalleriesSince(LocalDateTime startTime) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(Gallery::getCreateTime, startTime);
        return count(wrapper);
    }

    @Override
    public long sumLikesSince(LocalDateTime startTime) {
        Long sum = baseMapper.sumLikesSince(startTime);
        return sum != null ? sum : 0;
    }

    @Override
    public long sumCommentsSince(LocalDateTime startTime) {
        Long sum = baseMapper.sumCommentsSince(startTime);
        return sum != null ? sum : 0;
    }

    @Override
    public List<TopGalleriesByAccess> getTopGalleriesByLikes(int limit) {
        return userActionService.getTopGalleriesByLikes(limit);
    }

    @Override
    public List<Gallery> getTopGalleriesByViews(int limit) {
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .ge(Gallery::getCreateTime, LocalDateTime.now().minusDays(30))
               .orderByDesc(Gallery::getViewCount)
               .last("LIMIT " + limit);
        return list(wrapper);
    }

    @Override
    public List<Gallery> getRecommendedGalleries(Long currentId) {
        // 获取当前图库信息
        Gallery currentGallery = getById(currentId);
        String currentTitle = currentGallery != null ? currentGallery.getTitle() : "";

        // 提取关键字（根据标题中带【xxx】中的为重要的关键字，如果没有【xxx】则再试试《xxx》）
        String keyword = extractKeywordFromTitle(currentTitle);

        // 用于去重的ID集合
        Set<Long> excludeIds = new HashSet<>();
        excludeIds.add(currentId);

        List<Gallery> result = new ArrayList<>();

        // 1. 根据关键字匹配图库（前5个）
        if (keyword != null && !keyword.isEmpty()) {
            List<Gallery> matchedGalleries = findGalleriesByKeyword(keyword, excludeIds);
            // 将匹配结果加入结果列表和排除列表
            for (Gallery g : matchedGalleries) {
                if (result.size() < 5) {
                    result.add(g);
                    excludeIds.add(g.getId());
                } else {
                    break;
                }
            }
        }

        // 2. 如果匹配数少于5，用各维度前5补足到5个
        int needFill = 5 - result.size();
        if (needFill > 0) {
            List<Gallery> topGalleries = getTopGalleriesFromDimensions(excludeIds, needFill);
            result.addAll(topGalleries);
            for (Gallery g : topGalleries) {
                excludeIds.add(g.getId());
            }
        }

        // 3. 最后一个：取各个下载浏览收藏点赞前五的出来再去重取一个
        List<Gallery> lastOne = getTopGalleriesFromDimensions(excludeIds, 1);
        if (!lastOne.isEmpty()) {
            result.add(lastOne.get(0));
        }
        Collections.shuffle(result);
        return result;
    }

    /**
     * 根据关键字搜索图库
     */
    private List<Gallery> findGalleriesByKeyword(String keyword, Set<Long> excludeIds) {
        if (keyword == null || keyword.isEmpty()) {
            return new ArrayList<>();
        }

        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .like(Gallery::getTitle, keyword)
               .notIn(Gallery::getId, excludeIds)
               .last("LIMIT 20");

        return list(wrapper);
    }

    /**
     * 从各维度（下载、浏览、点赞、收藏）获取图库
     */
    private List<Gallery> getTopGalleriesFromDimensions(Set<Long> excludeIds, int limit) {
        List<Gallery> result = new ArrayList<>();

        // 1. 下载量
        List<Gallery> topDownloads = getMostDownloadedGalleries(limit * 2);
        for (Gallery g : topDownloads) {
            if (!excludeIds.contains(g.getId()) && result.size() < limit) {
                excludeIds.add(g.getId());
                result.add(g);
            }
        }

        // 2. 浏览量
        List<Gallery> topViews = getMostViewGalleries(limit * 2);
        for (Gallery g : topViews) {
            if (!excludeIds.contains(g.getId()) && result.size() < limit) {
                excludeIds.add(g.getId());
                result.add(g);
            }
        }

        // 3. 点赞量
        List<Gallery> topLikes = getMostLikedGalleries(limit * 2);
        for (Gallery g : topLikes) {
            if (!excludeIds.contains(g.getId()) && result.size() < limit) {
                excludeIds.add(g.getId());
                result.add(g);
            }
        }

        // 4. 收藏量
        if (result.size() < limit) {
            LambdaQueryWrapper<Gallery> favWrapper = new LambdaQueryWrapper<>();
            favWrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
                    .notIn(Gallery::getId, excludeIds)
                    .orderByDesc(Gallery::getFavoriteCount)
                    .last("LIMIT " + (limit * 2));
            List<Gallery> topFavorites = list(favWrapper);
            for (Gallery g : topFavorites) {
                if (!excludeIds.contains(g.getId()) && result.size() < limit) {
                    excludeIds.add(g.getId());
                    result.add(g);
                }
            }
        }
        Collections.shuffle(result);
        return result;
    }

    @Override
    public List<Gallery> getRecommendedGalleriesBack(Long currentId) {
        // 获取当前图库信息
        Gallery currentGallery = getById(currentId);
        String currentTitle = currentGallery != null ? currentGallery.getTitle() : "";

        // 收集各维度Top 5的图库
        Set<Long> idSet = new HashSet<>();
        idSet.add(currentId); // 排除当前图库

        List<Gallery> result = new ArrayList<>();

        // 1. 下载量前5
        List<Gallery> topDownloads = getMostDownloadedGalleries(5);
        for (Gallery g : topDownloads) {
            if (!idSet.contains(g.getId())) {
                idSet.add(g.getId());
                result.add(g);
            }
        }

        // 2. 浏览量前5
        List<Gallery> topViews = getMostViewGalleries(5);
        for (Gallery g : topViews) {
            if (!idSet.contains(g.getId()) && result.size() < 5) {
                idSet.add(g.getId());
                result.add(g);
            }
        }

        // 3. 点赞量前5
        List<Gallery> topLikes = getMostLikedGalleries(5);
        for (Gallery g : topLikes) {
            if (!idSet.contains(g.getId()) && result.size() < 5) {
                idSet.add(g.getId());
                result.add(g);
            }
        }

        // 4. 收藏量前5 (favoriteCount排序)
        LambdaQueryWrapper<Gallery> favWrapper = new LambdaQueryWrapper<>();
        favWrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
                .orderByDesc(Gallery::getFavoriteCount)
                .last("LIMIT 5");
        List<Gallery> topFavorites = list(favWrapper);
        for (Gallery g : topFavorites) {
            if (!idSet.contains(g.getId()) && result.size() < 5) {
                idSet.add(g.getId());
                result.add(g);
            }
        }

        // 随机打乱并取前5个
        Collections.shuffle(result);
        List<Gallery> top5 = result.stream().limit(5).collect(Collectors.toList());

        // 更新排除列表，加入已选中的图库ID
        Set<Long> selectedIds = new HashSet<>();
        selectedIds.add(currentId);
        for (Gallery g : top5) {
            selectedIds.add(g.getId());
        }

        // 5. 最后一个：根据当前帖子标题匹配相似名称的帖子
        Gallery similarGallery = findSimilarGallery(currentTitle, selectedIds);
        if (similarGallery != null) {
            top5.add(similarGallery);
        } else {
            // 如果没有相似的，再随机补一个
            LambdaQueryWrapper<Gallery> fillWrapper = new LambdaQueryWrapper<>();
            fillWrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
                    .notIn(Gallery::getId, selectedIds)
                    .last("LIMIT 1");
            Gallery fillGallery = getOne(fillWrapper);
            if (fillGallery != null) {
                top5.add(fillGallery);
            }
        }

        return top5;
    }

    /**
     * 从标题中提取关键字
     * 优先提取【xxx】中的关键字，如果没有则提取《xxx》中的关键字
     */
    private String extractKeywordFromTitle(String title) {
        if (title == null || title.isEmpty()) {
            return null;
        }

        // 优先提取【xxx】中的内容
        int start = title.indexOf("【");
        int end = title.indexOf("】");
        if (start != -1 && end != -1 && end > start + 1) {
            return title.substring(start + 1, end);
        }

        // 其次提取《xxx》中的内容
        start = title.indexOf("《");
        end = title.indexOf("》");
        if (start != -1 && end != -1 && end > start + 1) {
            return title.substring(start + 1, end);
        }

        return null;
    }

    /**
     * 根据关键字查找图库
     * 
     * @param keyword 搜索关键字
     * @param excludeIds 需要排除的ID集合
     * @param limit 限制结果数量
     * @return 匹配的图库列表
     */
    private List<Gallery> findGalleriesByKeyword(String keyword, Set<Long> excludeIds, int limit) {
        if (keyword == null || keyword.isEmpty()) {
            return new ArrayList<>();
        }

        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .notIn(Gallery::getId, excludeIds)
               .like(Gallery::getTitle, keyword)
               .last("LIMIT " + limit);
        
        return list(wrapper);
    }

    /**
     * 根据标题查找相似图库
     * 匹配规格：
     * - 优先使用【xxx】中的关键字
     * - 如果没有【xxx】，则尝试《xxx》中的关键字
     * - 然后根据这个关键字去系统LIKE匹配
     * 
     * @param title 标题
     * @param excludeIds 需要排除的ID集合
     * @return 匹配的图库
     */
    private Gallery findSimilarGallery(String title, Set<Long> excludeIds) {
        if (title == null || title.isEmpty()) {
            return null;
        }

        // 从标题中提取关键字
        String keyword = extractKeywordFromTitle(title);
        if (keyword == null || keyword.isEmpty()) {
            return null;
        }

        // 根据关键字进行LIKE匹配
        LambdaQueryWrapper<Gallery> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Gallery::getStatus, Gallery.GalleryStatus.PUBLISHED)
               .notIn(Gallery::getId, excludeIds)
               .like(Gallery::getTitle, keyword)
               .last("LIMIT 1");

        return getOne(wrapper);
    }

    private GalleryDetailResponse.GalleryImageResponse toImageResponse(GalleryImage image) {
        GalleryDetailResponse.GalleryImageResponse response = new GalleryDetailResponse.GalleryImageResponse();
        response.setId(image.getId());
        response.setUrl(image.getUrl());
        response.setDescription(image.getDescription());
        response.setSortOrder(image.getSortOrder());
        return response;
    }
}
