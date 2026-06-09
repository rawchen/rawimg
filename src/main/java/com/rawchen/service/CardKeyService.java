package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.CardKey;

import java.util.List;

/**
 * 卡密服务接口
 */
public interface CardKeyService extends IService<CardKey> {

    /**
     * 批量生成卡密
     * @param cardType 卡类型
     * @param cardValue 卡值(天数或积分数)
     * @param amount 面值金额
     * @param quantity 数量
     * @param expireDays 过期天数(从今天起算)
     * @param remark 备注
     * @return 生成的卡密列表
     */
    List<CardKey> generateCardKeys(CardKey.CardType cardType, Integer cardValue, 
                                    java.math.BigDecimal amount, int quantity, 
                                    Integer expireDays, String remark);

    /**
     * 兑换卡密
     * @param userId 用户ID
     * @param cardCode 卡密码
     * @return 订单
     */
    com.rawchen.entity.Order redeemCardKey(Long userId, String cardCode);

    /**
     * 根据卡密码查询
     * @param cardCode 卡密码
     * @return 卡密
     */
    CardKey getByCardCode(String cardCode);

    /**
     * 分页查询卡密
     * @param page 页码
     * @param size 每页数量
     * @param status 状态筛选
     * @param cardType 类型筛选
     * @param batchNo 批次号筛选
     * @return 分页结果
     */
    IPage<CardKey> getCardKeysPage(int page, int size, String status, String cardType, String batchNo);

    /**
     * 作废卡密
     * @param id 卡密ID
     * @return 是否成功
     */
    boolean invalidateCardKey(Long id);

    /**
     * 获取批次号列表
     * @return 批次号列表
     */
    List<String> getBatchNoList();
}
