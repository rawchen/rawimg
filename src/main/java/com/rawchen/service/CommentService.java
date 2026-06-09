package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.Comment;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 评论服务接口
 */
public interface CommentService extends IService<Comment> {

    /**
     * 创建评论
     */
    Comment createComment(Long userId, Long galleryId, String content, Long parentId);

    /**
     * 获取图库的评论列表（分页）
     */
    IPage<Comment> getCommentsByGallery(Long galleryId, int page, int size);

    /**
     * 获取图库的根评论列表（无父评论）
     */
    List<Comment> getRootCommentsByGallery(Long galleryId);

    /**
     * 删除评论
     */
    void deleteComment(Long id);

    /**
     * 获取用户的评论列表（分页）
     */
    IPage<Comment> getCommentsByUser(Long userId, int page, int size);

    /**
     * 统计指定时间以来的评论数
     */
    long countCommentsSince(LocalDateTime startTime);
}
