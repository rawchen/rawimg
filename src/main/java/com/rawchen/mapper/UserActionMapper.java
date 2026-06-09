package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.ChartItemResponse;
import com.rawchen.dto.UserActionWithUser;
import com.rawchen.entity.Gallery;
import com.rawchen.entity.UserAction;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.dto.TrendItemResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 用户行为Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findByUserIdAndGalleryIdAndType(userId, galleryId, type)
 * 替换为: selectOne(new LambdaQueryWrapper<UserAction>()
 *              .eq(UserAction::getUserId, userId)
 *              .eq(UserAction::getGalleryId, galleryId)
 *              .eq(UserAction::getActionType, type))
 * 
 * 原方法: deleteByUserIdAndGalleryIdAndType(userId, galleryId, type)
 * 替换为: delete(new LambdaQueryWrapper<UserAction>()
 *              .eq(UserAction::getUserId, userId)
 *              .eq(UserAction::getGalleryId, galleryId)
 *              .eq(UserAction::getActionType, type))
 * 
 * 原方法: countByUserIdAndType(userId, type)
 * 替换为: selectCount(new LambdaQueryWrapper<UserAction>()
 *              .eq(UserAction::getUserId, userId)
 *              .eq(UserAction::getActionType, type))
 */
@Mapper
public interface UserActionMapper extends BaseMapper<UserAction> {

    /**
     * 检查用户是否对某个图库执行过某种操作
     * EXISTS子查询，保留@Select
     */
    @Select("SELECT EXISTS(SELECT 1 FROM user_action WHERE user_id = #{userId} AND gallery_id = #{galleryId} AND action_type = #{type} AND deleted = 0)")
    boolean existsByUserIdAndGalleryIdAndType(@Param("userId") Long userId, @Param("galleryId") Long galleryId, @Param("type") String type);

    /**
     * 获取指定行为类型的Top图库
     * GROUP BY聚合查询，保留@Select
     */
    @Select("SELECT gallery_id, COUNT(*) as cnt FROM user_action WHERE action_type = #{type} AND deleted = 0 GROUP BY gallery_id ORDER BY cnt DESC LIMIT #{limit}")
    List<TopGalleriesByAccess> findTopGalleriesByActionType(@Param("type") String type, @Param("limit") int limit);

    /**
     * 获取用户收藏的图库列表（分页）
     * JOIN多表查询，保留@Select
     */
    @Select("SELECT g.* FROM gallery g INNER JOIN user_action ua ON g.id = ua.gallery_id WHERE ua.user_id = #{userId} AND ua.action_type = 'FAVORITE' AND g.deleted = 0 AND ua.deleted = 0 ORDER BY ua.create_time DESC")
    IPage<Gallery> findFavoriteGalleriesByUserId(Page<?> page, @Param("userId") Long userId);

    /**
     * 获取点赞最多的图库（包含标题）
     * JOIN gallery表一次性获取标题和点赞数
     */
    @Select("SELECT g.title, COUNT(*) as count FROM user_action ua JOIN gallery g ON ua.gallery_id = g.id WHERE ua.action_type = 'LIKE' AND ua.deleted = 0 AND g.deleted = 0 GROUP BY ua.gallery_id ORDER BY count DESC LIMIT #{limit}")
    List<ChartItemResponse> findTopGalleriesByLikesWithTitles(@Param("limit") int limit);

    /**
     * 获取收藏最多的图库（包含标题）
     * JOIN gallery表一次性获取标题和收藏数
     */
    @Select("SELECT g.title, COUNT(*) as count FROM user_action ua JOIN gallery g ON ua.gallery_id = g.id WHERE ua.action_type = 'FAVORITE' AND ua.deleted = 0 AND g.deleted = 0 GROUP BY ua.gallery_id ORDER BY count DESC LIMIT #{limit}")
    List<ChartItemResponse> findTopGalleriesByFavoritesWithTitles(@Param("limit") int limit);

    /**
     * 统计最近30天的下载量趋势
     * GROUP BY日期分组，一次性查询30天数据
     */
    @Select("SELECT DATE(create_time) as date, COUNT(*) as downloads FROM user_action WHERE create_time >= #{startDate} AND action_type = 'DOWNLOAD' AND deleted = 0 GROUP BY DATE(create_time) ORDER BY date")
    List<Map<String, Object>> findDownloadsTrendChart(@Param("startDate") LocalDateTime startDate);

    /**
     * 统计最近30天的点赞量趋势
     * GROUP BY日期分组，一次性查询30天数据
     */
    @Select("SELECT DATE(create_time) as date, COUNT(*) as likes FROM user_action WHERE create_time >= #{startDate} AND action_type = 'LIKE' AND deleted = 0 GROUP BY DATE(create_time) ORDER BY date")
    List<Map<String, Object>> findLikesTrendChart(@Param("startDate") LocalDateTime startDate);

    /**
     * 统计最近30天的收藏量趋势
     * GROUP BY日期分组，一次性查询30天数据
     */
    @Select("SELECT DATE(create_time) as date, COUNT(*) as favorites FROM user_action WHERE create_time >= #{startDate} AND action_type = 'FAVORITE' AND deleted = 0 GROUP BY DATE(create_time) ORDER BY date")
    List<Map<String, Object>> findFavoritesTrendChart(@Param("startDate") LocalDateTime startDate);

    /**
     * 分页查询用户行为日志（包含用户名）
     * JOIN sys_user表一次性获取用户名
     */
    @Select("<script>" +
            "SELECT ua.id, ua.user_id, u.username, ua.gallery_id, ua.action_type, ua.create_time " +
            "FROM user_action ua " +
            "LEFT JOIN sys_user u ON ua.user_id = u.id " +
            "WHERE ua.deleted = 0 " +
            "<if test='actionType != null and actionType != \"\"'>" +
            "AND ua.action_type = #{actionType} " +
            "</if>" +
            "<if test='userId != null'>" +
            "AND ua.user_id = #{userId} " +
            "</if>" +
            "<if test='galleryId != null'>" +
            "AND ua.gallery_id = #{galleryId} " +
            "</if>" +
            "ORDER BY ua.create_time DESC" +
            "</script>"
    )
    IPage<UserActionWithUser> selectUserActionsWithUser(Page<?> page, @Param("actionType") String actionType, @Param("userId") Long userId, @Param("galleryId") Long galleryId);
}
