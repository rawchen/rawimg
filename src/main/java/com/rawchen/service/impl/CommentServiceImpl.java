package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.Comment;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.SysUser;
import com.rawchen.mapper.CommentMapper;
import com.rawchen.mapper.GalleryMapper;
import com.rawchen.mapper.SysUserMapper;
import com.rawchen.service.CommentService;
import com.rawchen.service.GalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 评论服务实现类
 */
@Service
@RequiredArgsConstructor
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements CommentService {

    private final SysUserMapper userMapper;
    private final GalleryMapper galleryMapper;
    private final GalleryService galleryService;

    @Override
    @Transactional
    public Comment createComment(Long userId, Long galleryId, String content, Long parentId) {
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }

        Gallery gallery = galleryMapper.selectById(galleryId);
        if (gallery == null) {
            throw new RuntimeException("Gallery not found");
        }

        Comment comment = new Comment();
        comment.setUserId(userId);
        comment.setGalleryId(galleryId);
        comment.setContent(content);
        comment.setParentId(parentId);

        save(comment);

        // Update gallery comment count
        gallery.setCommentCount(gallery.getCommentCount() + 1);
        galleryMapper.updateById(gallery);

        // 填充用户名
        comment.setUsername(user.getNickname());

        return comment;
    }

    @Override
    public IPage<Comment> getCommentsByGallery(Long galleryId, int page, int size) {
        LambdaQueryWrapper<Comment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Comment::getGalleryId, galleryId)
               .orderByAsc(Comment::getCreateTime);
        IPage<Comment> commentPage = page(new Page<>(page, size), wrapper);
        
        // 填充用户名
        fillUsernames(commentPage.getRecords());
        return commentPage;
    }
    
    /**
     * 批量填充评论的用户名
     */
    private void fillUsernames(List<Comment> comments) {
        if (comments == null || comments.isEmpty()) {
            return;
        }
        List<Long> userIds = comments.stream()
                .map(Comment::getUserId)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
        
        List<SysUser> users = userMapper.selectBatchIds(userIds);
        java.util.Map<Long, String> userMap = users.stream()
                .collect(java.util.stream.Collectors.toMap(SysUser::getId, SysUser::getNickname));
        
        comments.forEach(comment -> 
            comment.setUsername(userMap.get(comment.getUserId()))
        );
    }

    @Override
    public List<Comment> getRootCommentsByGallery(Long galleryId) {
        LambdaQueryWrapper<Comment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Comment::getGalleryId, galleryId)
               .isNull(Comment::getParentId)
               .orderByAsc(Comment::getCreateTime);
        return list(wrapper);
    }

    @Override
    @Transactional
    public void deleteComment(Long id) {
        Comment comment = getById(id);
        if (comment == null) {
            throw new RuntimeException("Comment not found");
        }

        // Update gallery comment count
        Gallery gallery = galleryMapper.selectById(comment.getGalleryId());
        if (gallery != null) {
            gallery.setCommentCount(Math.max(0, gallery.getCommentCount() - 1));
            galleryMapper.updateById(gallery);
        }

        removeById(id);
    }

    @Override
    public IPage<Comment> getCommentsByUser(Long userId, int page, int size) {
        LambdaQueryWrapper<Comment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Comment::getUserId, userId)
               .orderByDesc(Comment::getCreateTime);
        IPage<Comment> commentPage = page(new Page<>(page, size), wrapper);
        
        // 填充用户名
        fillUsernames(commentPage.getRecords());
        return commentPage;
    }

    @Override
    public long countCommentsSince(LocalDateTime startTime) {
        LambdaQueryWrapper<Comment> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(Comment::getCreateTime, startTime);
        return count(wrapper);
    }
}
