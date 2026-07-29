package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.ConsumeLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 消费日志Mapper
 */
@Mapper
public interface ConsumeLogMapper extends BaseMapper<ConsumeLog> {
}
