package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.Comment;
import org.apache.ibatis.annotations.Mapper;

/**
 * 评论Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findByGalleryIdOrderByCreateTimeAsc(galleryId)
 * 替换为: selectList(new LambdaQueryWrapper<Comment>()
 *              .eq(Comment::getGalleryId, galleryId)
 *              .orderByAsc(Comment::getCreateTime))
 * 
 * 原方法: findRootCommentsByGalleryId(galleryId)
 * 替换为: selectList(new LambdaQueryWrapper<Comment>()
 *              .eq(Comment::getGalleryId, galleryId)
 *              .isNull(Comment::getParentId)
 *              .orderByAsc(Comment::getCreateTime))
 * 
 * 原方法: countCommentsSince(startTime)
 * 替换为: selectCount(new LambdaQueryWrapper<Comment>()
 *              .ge(Comment::getCreateTime, startTime))
 * 
 * 原方法: findByUserId(userId) - 分页查询用户评论
 * 替换为: selectPage(page, new LambdaQueryWrapper<Comment>()
 *              .eq(Comment::getUserId, userId)
 *              .orderByDesc(Comment::getCreateTime))
 */
@Mapper
public interface CommentMapper extends BaseMapper<Comment> {
    // 简单查询已迁移至Service层使用LambdaQueryWrapper
    // BaseMapper提供的内置方法已足够使用
}
