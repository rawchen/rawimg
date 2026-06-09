package com.rawchen.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.entity.Order;
import org.apache.ibatis.annotations.Mapper;

/**
 * 订单Mapper接口
 * 
 * 以下简单查询已迁移至Service层使用LambdaQueryWrapper：
 * 
 * 原方法: findByOrderNo(orderNo)
 * 替换为: selectOne(new LambdaQueryWrapper<Order>()
 *              .eq(Order::getOrderNo, orderNo))
 * 
 * 原方法: findByTransactionId(transactionId)
 * 替换为: selectOne(new LambdaQueryWrapper<Order>()
 *              .eq(Order::getTransactionId, transactionId))
 */
@Mapper
public interface OrderMapper extends BaseMapper<Order> {
    // 简单查询已迁移至Service层使用LambdaQueryWrapper
    // BaseMapper提供的内置方法已足够使用
}
