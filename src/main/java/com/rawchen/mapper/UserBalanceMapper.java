package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.UserBalance;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户余额Mapper
 */
@Mapper
public interface UserBalanceMapper extends BaseMapper<UserBalance> {
}
