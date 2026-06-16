package com.rawchen.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rawchen.entity.InspirationTemplate;
import com.rawchen.entity.R;
import com.rawchen.mapper.InspirationTemplateMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

/**
 * 灵感模板后台管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/inspiration")
@RequiredArgsConstructor
public class AdminInspirationController {

    private final InspirationTemplateMapper inspirationTemplateMapper;

    /**
     * 分页查询灵感模板
     */
    @GetMapping("/list")
    public R<Page<InspirationTemplate>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String category) {

        Page<InspirationTemplate> pageObj = new Page<>(page, size);
        LambdaQueryWrapper<InspirationTemplate> wrapper = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(title)) {
            wrapper.like(InspirationTemplate::getTitle, title);
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(InspirationTemplate::getCategory, category);
        }
        wrapper.orderByDesc(InspirationTemplate::getCreateTime);

        return R.ok(inspirationTemplateMapper.selectPage(pageObj, wrapper));
    }

    /**
     * 获取单个灵感模板
     */
    @GetMapping("/{id}")
    public R<InspirationTemplate> get(@PathVariable Long id) {
        InspirationTemplate template = inspirationTemplateMapper.selectById(id);
        if (template == null) {
            return R.fail("模板不存在");
        }
        return R.ok(template);
    }

    /**
     * 新增灵感模板
     */
    @PostMapping
    public R<InspirationTemplate> add(@RequestBody InspirationTemplate template) {
        if (!StringUtils.hasText(template.getTitle())) {
            return R.badRequest("请输入标题");
        }
        if (!StringUtils.hasText(template.getPrompt())) {
            return R.badRequest("请输入提示词");
        }
        if (!StringUtils.hasText(template.getCategory())) {
            return R.badRequest("请选择分类");
        }

        inspirationTemplateMapper.insert(template);
        return R.ok(template);
    }

    /**
     * 修改灵感模板
     */
    @PutMapping("/{id}")
    public R<InspirationTemplate> update(@PathVariable Long id, @RequestBody InspirationTemplate template) {
        InspirationTemplate existing = inspirationTemplateMapper.selectById(id);
        if (existing == null) {
            return R.fail("模板不存在");
        }

        template.setId(id);
        inspirationTemplateMapper.updateById(template);
        return R.ok(template);
    }

    /**
     * 删除灵感模板
     */
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        inspirationTemplateMapper.deleteById(id);
        return R.ok();
    }

    /**
     * 批量删除灵感模板
     */
    @DeleteMapping("/batch")
    public R<Void> deleteBatch(@RequestBody Long[] ids) {
        for (Long id : ids) {
            inspirationTemplateMapper.deleteById(id);
        }
        return R.ok();
    }
}
