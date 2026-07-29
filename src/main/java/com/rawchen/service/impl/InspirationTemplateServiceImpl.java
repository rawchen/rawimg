package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.entity.InspirationTemplate;
import com.rawchen.mapper.InspirationTemplateMapper;
import com.rawchen.service.InspirationTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 灵感模板服务实现类
 */
@Service
@RequiredArgsConstructor
public class InspirationTemplateServiceImpl implements InspirationTemplateService {

    private final InspirationTemplateMapper inspirationTemplateMapper;

    @Override
    public List<InspirationTemplate> getTemplates(String category) {
        LambdaQueryWrapper<InspirationTemplate> wrapper = new LambdaQueryWrapper<>();
        if (category != null && !category.isEmpty()) {
            wrapper.eq(InspirationTemplate::getCategory, category);
        }
        wrapper.orderByAsc(InspirationTemplate::getSortOrder);
        return inspirationTemplateMapper.selectList(wrapper);
    }

    @Override
    public IPage<InspirationTemplate> getTemplatesPage(String category, int page, int size) {
        LambdaQueryWrapper<InspirationTemplate> wrapper = new LambdaQueryWrapper<>();
        if (category != null && !category.isEmpty()) {
            wrapper.eq(InspirationTemplate::getCategory, category);
        }
        wrapper.orderByAsc(InspirationTemplate::getSortOrder);
        Page<InspirationTemplate> pageParam = new Page<>(page, size);
        return inspirationTemplateMapper.selectPage(pageParam, wrapper);
    }

    @Override
    public List<InspirationTemplate> getRandomTemplates(int count) {
        LambdaQueryWrapper<InspirationTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.last("ORDER BY RAND() LIMIT " + count);
        return inspirationTemplateMapper.selectList(wrapper);
    }

    @Override
    public List<String> getCategories() {
        LambdaQueryWrapper<InspirationTemplate> wrapper = new LambdaQueryWrapper<>();
        wrapper.select(InspirationTemplate::getCategory);
        wrapper.groupBy(InspirationTemplate::getCategory);
        wrapper.orderByAsc(InspirationTemplate::getCategory);
        List<InspirationTemplate> templates = inspirationTemplateMapper.selectList(wrapper);
        return templates.stream()
                .map(InspirationTemplate::getCategory)
                .distinct()
                .collect(Collectors.toList());
    }
}