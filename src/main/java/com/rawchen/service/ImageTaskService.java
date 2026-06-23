package com.rawchen.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.ImageTask;

/**
 * 图像任务服务接口
 */
public interface ImageTaskService extends IService<ImageTask> {

    /**
     * 根据任务ID查询任务
     *
     * @param taskId 任务ID
     * @return 任务实体
     */
    ImageTask getByTaskId(String taskId);

    /**
     * 更新任务状态为成功
     *
     * @param taskId        任务ID
     * @param resultImageUrl 结果图片URL
     * @param duration      耗时（毫秒）
     */
    void updateSuccess(String taskId, String resultImageUrl, Long duration);

    /**
     * 更新任务状态为失败
     *
     * @param taskId   任务ID
     * @param errorMsg 错误信息
     * @param duration 耗时（毫秒）
     */
    void updateError(String taskId, String errorMsg, Long duration);

    /**
     * 分页查询用户的任务历史
     *
     * @param userId   用户ID
     * @param page     页码
     * @param size     每页大小
     * @param taskType 任务类型（可选）
     * @param status   任务状态（可选）
     * @return 分页结果
     */
    IPage<ImageTask> getUserTaskPage(Long userId, int page, int size, String taskType, String status);

    /**
     * 分页查询所有任务（管理员）
     *
     * @param page     页码
     * @param size     每页大小
     * @param userId   用户ID（可选）
     * @param taskType 任务类型（可选）
     * @param status   任务状态（可选）
     * @return 分页结果
     */
    IPage<ImageTask> getAdminTaskPage(int page, int size, Long userId, String taskType, String status);
}
