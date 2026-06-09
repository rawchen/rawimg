package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.dto.FeedbackWithUser;
import com.rawchen.entity.Feedback;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface FeedbackMapper extends BaseMapper<Feedback> {

    /**
     * 分页查询反馈列表（包含用户名）
     * JOIN sys_user表一次性获取用户名
     */
    @Select("<script>" +
            "SELECT f.id, f.user_id, u.username, f.content, f.contact, f.images, f.status, f.reply, f.create_time " +
            "FROM feedback f " +
            "LEFT JOIN sys_user u ON f.user_id = u.id " +
            "WHERE f.deleted = 0 " +
            "<if test='status != null'>" +
            "AND f.status = #{status} " +
            "</if>" +
            "ORDER BY f.create_time DESC" +
            "</script>"
    )
    IPage<FeedbackWithUser> selectFeedbacksWithUser(Page<?> page, @Param("status") Integer status);
}
