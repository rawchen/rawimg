package com.rawchen.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.ImageTask;
import com.rawchen.mapper.ImageTaskMapper;
import com.rawchen.service.ImageTaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 图像任务服务实现
 */
@Slf4j
@Service
public class ImageTaskServiceImpl extends ServiceImpl<ImageTaskMapper, ImageTask> implements ImageTaskService {

    @Override
    public ImageTask getByTaskId(String taskId) {
        return getOne(new LambdaQueryWrapper<ImageTask>()
                .eq(ImageTask::getTaskId, taskId));
    }

    @Override
    public void updateSuccess(String taskId, String resultImageUrl, Long duration) {
        update(new LambdaUpdateWrapper<ImageTask>()
                .eq(ImageTask::getTaskId, taskId)
                .set(ImageTask::getStatus, "done")
                .set(ImageTask::getResultImageUrl, resultImageUrl)
                .set(ImageTask::getDuration, duration));
        log.info("Task {} completed successfully, duration={}ms", taskId, duration);
    }

    @Override
    public void updateError(String taskId, String errorMsg, Long duration) {
        update(new LambdaUpdateWrapper<ImageTask>()
                .eq(ImageTask::getTaskId, taskId)
                .set(ImageTask::getStatus, "error")
                .set(ImageTask::getErrorMsg, errorMsg)
                .set(ImageTask::getDuration, duration));
        log.error("Task {} failed: {}, duration={}ms", taskId, errorMsg, duration);
    }

    @Override
    public IPage<ImageTask> getUserTaskPage(Long userId, int page, int size, String taskType, String status) {
        Page<ImageTask> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<ImageTask> wrapper = new LambdaQueryWrapper<ImageTask>()
                .eq(ImageTask::getUserId, userId)
                .eq(StringUtils.hasText(taskType), ImageTask::getTaskType, taskType)
                .eq(StringUtils.hasText(status), ImageTask::getStatus, status)
                .orderByDesc(ImageTask::getCreateTime);
        return page(pageParam, wrapper);
    }

    @Override
    public IPage<ImageTask> getAdminTaskPage(int page, int size, Long userId, String taskType, String status) {
        Page<ImageTask> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<ImageTask> wrapper = new LambdaQueryWrapper<ImageTask>()
                .eq(userId != null, ImageTask::getUserId, userId)
                .eq(StringUtils.hasText(taskType), ImageTask::getTaskType, taskType)
                .eq(StringUtils.hasText(status), ImageTask::getStatus, status)
                .orderByDesc(ImageTask::getCreateTime);
        return page(pageParam, wrapper);
    }
}
