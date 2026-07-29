package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.InspirationTemplate;

import java.util.List;

/**
 * 灵感模板服务接口
 */
public interface InspirationTemplateService {

    /**
     * 获取模板列表
     *
     * @param category 分类（可选）
     * @return 模板列表
     */
    List<InspirationTemplate> getTemplates(String category);

    /**
     * 获取模板列表（分页）
     *
     * @param category 分类（可选）
     * @param page     页码
     * @param size     每页大小
     * @return 分页模板列表
     */
    IPage<InspirationTemplate> getTemplatesPage(String category, int page, int size);

    /**
     * 随机获取模板
     *
     * @param count 数量
     * @return 随机模板列表
     */
    List<InspirationTemplate> getRandomTemplates(int count);

    /**
     * 获取所有分类
     *
     * @return 分类列表
     */
    List<String> getCategories();
}