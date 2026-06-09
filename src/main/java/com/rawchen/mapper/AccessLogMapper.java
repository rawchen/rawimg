package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.AccessLogWithUser;
import com.rawchen.dto.ChartItemResponse;
import com.rawchen.dto.TopGalleriesByAccess;
import com.rawchen.dto.TrendItemResponse;
import com.rawchen.entity.AccessLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 访问日志Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findRecentAccess(startTime)
 * 替换为: selectList(new LambdaQueryWrapper<AccessLog>()
 *              .ge(AccessLog::getCreateTime, startTime)
 *              .orderByDesc(AccessLog::getCreateTime))
 * 
 * 原方法: countAccessSince(startTime)
 * 替换为: selectCount(new LambdaQueryWrapper<AccessLog>()
 *              .ge(AccessLog::getCreateTime, startTime))
 */
@Mapper
public interface AccessLogMapper extends BaseMapper<AccessLog> {

    /**
     * 获取访问量最高的图库
     * GROUP BY聚合查询，保留@Select
     */
    @Select("SELECT gallery_id, COUNT(*) as cnt FROM access_log WHERE create_time >= #{startTime} AND deleted = 0 GROUP BY gallery_id ORDER BY cnt DESC LIMIT #{limit}")
    List<TopGalleriesByAccess> findTopGalleriesByAccess(@Param("startTime") LocalDateTime startTime, @Param("limit") int limit);

    /**
     * 统计独立访客数
     * DISTINCT去重计数，保留@Select
     */
    @Select("SELECT COUNT(DISTINCT ip) FROM access_log WHERE create_time >= #{startTime} AND deleted = 0")
    long countUniqueVisitorsSince(@Param("startTime") LocalDateTime startTime);

    /**
     * 统计最近30天的访问量趋势
     * GROUP BY日期分组，一次性查询30天数据
     */
    @Select("SELECT DATE(create_time) as date, COUNT(*) as views, COUNT(DISTINCT ip) as uv FROM access_log WHERE create_time >= #{startDate} AND deleted = 0 GROUP BY DATE(create_time) ORDER BY date")
    List<Map<String, Object>> findTrendChart(@Param("startDate") LocalDateTime startDate);

    /**
     * 获取访问量最高的图库（包含标题）
     * JOIN gallery表一次性获取标题和访问量
     */
    @Select("SELECT g.title, COUNT(*) as count FROM access_log a JOIN gallery g ON a.gallery_id = g.id WHERE a.create_time >= #{startTime} AND a.deleted = 0 AND g.deleted = 0 GROUP BY a.gallery_id ORDER BY count DESC LIMIT #{limit}")
    List<ChartItemResponse> findTopGalleriesByAccessWithTitles(@Param("startTime") LocalDateTime startTime, @Param("limit") int limit);

    /**
     * 分页查询访问日志（包含用户名）
     * JOIN sys_user表一次性获取用户名
     */
    @Select("<script>" +
            "SELECT a.id, a.user_id, u.username, a.gallery_id, a.ip_address as ip, a.ip_location as region, " +
            "a.user_agent, a.access_type as action, a.create_time " +
            "FROM access_log a " +
            "LEFT JOIN sys_user u ON a.user_id = u.id " +
            "WHERE a.deleted = 0 " +
            "<if test='action != null and action != \"\"'>" +
            "AND a.access_type = #{action} " +
            "</if>" +
            "<if test='userId != null'>" +
            "AND a.user_id = #{userId} " +
            "</if>" +
            "<if test='galleryId != null'>" +
            "AND a.gallery_id = #{galleryId} " +
            "</if>" +
            "ORDER BY a.create_time DESC" +
            "</script>"
    )
    IPage<AccessLogWithUser> selectAccessLogsWithUser(Page<?> page, @Param("action") String action, @Param("userId") Long userId, @Param("galleryId") Long galleryId);
}
