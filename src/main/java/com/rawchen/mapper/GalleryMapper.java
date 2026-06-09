package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.Gallery;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;

/**
 * 图库Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findLatestPublished(limit)
 * 替换为: selectList(new LambdaQueryWrapper<Gallery>()
 *              .eq(Gallery::getStatus, GalleryStatus.PUBLISHED)
 *              .orderByDesc(Gallery::getCreateTime)
 *              .last("LIMIT " + limit))
 * 
 * 原方法: findMostLiked(limit)
 * 替换为: selectList(new LambdaQueryWrapper<Gallery>()
 *              .eq(Gallery::getStatus, GalleryStatus.PUBLISHED)
 *              .orderByDesc(Gallery::getLikeCount)
 *              .last("LIMIT " + limit))
 * 
 * 原方法: findMostCommented(limit)
 * 替换为: selectList(new LambdaQueryWrapper<Gallery>()
 *              .eq(Gallery::getStatus, GalleryStatus.PUBLISHED)
 *              .orderByDesc(Gallery::getCommentCount)
 *              .last("LIMIT " + limit))
 * 
 * 原方法: findMostDownloaded(limit)
 * 替换为: selectList(new LambdaQueryWrapper<Gallery>()
 *              .eq(Gallery::getStatus, GalleryStatus.PUBLISHED)
 *              .orderByDesc(Gallery::getDownloadCount)
 *              .last("LIMIT " + limit))
 * 
 * 原方法: findLikeSince(startTime, limit)
 * 替换为: selectList(new LambdaQueryWrapper<Gallery>()
 *              .eq(Gallery::getStatus, GalleryStatus.PUBLISHED)
 *              .ge(Gallery::getCreateTime, startTime)
 *              .orderByDesc(Gallery::getViewCount)
 *              .last("LIMIT " + limit))
 * 
 * 原方法: countByStatus(status)
 * 替换为: selectCount(new LambdaQueryWrapper<Gallery>()
 *              .eq(Gallery::getStatus, status))
 * 
 * 原方法: countGalleriesSince(startTime)
 * 替换为: selectCount(new LambdaQueryWrapper<Gallery>()
 *              .ge(Gallery::getCreateTime, startTime))
 * 
 * 原方法: countAll()
 * 替换为: selectCount(null)
 */
@Mapper
public interface GalleryMapper extends BaseMapper<Gallery> {

    /**
     * 统计指定时间以来的点赞总数
     * SUM聚合函数，保留@Select
     */
    @Select("SELECT COALESCE(SUM(like_count), 0) FROM gallery WHERE create_time >= #{startTime} AND deleted = 0")
    Long sumLikesSince(@Param("startTime") LocalDateTime startTime);

    /**
     * 统计指定时间以来的评论总数
     * SUM聚合函数，保留@Select
     */
    @Select("SELECT COALESCE(SUM(comment_count), 0) FROM gallery WHERE create_time >= #{startTime} AND deleted = 0")
    Long sumCommentsSince(@Param("startTime") LocalDateTime startTime);
}
