package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.entity.ImageTask;
import com.rawchen.entity.R;
import com.rawchen.service.ImageTaskService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 管理后台 - 图像任务管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/image-tasks")
@RequiredArgsConstructor
public class AdminImageTaskController {

    private final ImageTaskService imageTaskService;

    /**
     * 分页查询任务列表
     *
     * @param page     页码
     * @param size     每页大小
     * @param userId   用户ID（可选）
     * @param taskType 任务类型（可选）
     * @param status   任务状态（可选）
     * @return 任务列表
     */
    @GetMapping("/list")
    public R<TaskPageResponse> getTaskList(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "20") Integer size,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "taskType", required = false) String taskType,
            @RequestParam(value = "status", required = false) String status) {

        IPage<ImageTask> taskPage = imageTaskService.getAdminTaskPage(page, size, userId, taskType, status);

        TaskPageResponse response = new TaskPageResponse();
        response.setRecords(taskPage.getRecords());
        response.setTotal(taskPage.getTotal());
        response.setPages(taskPage.getPages());
        response.setCurrent(taskPage.getCurrent());
        response.setSize(taskPage.getSize());
        return R.ok(response);
    }

    /**
     * 获取任务详情
     *
     * @param id 任务ID
     * @return 任务详情
     */
    @GetMapping("/{id}")
    public R<ImageTask> getTaskDetail(@PathVariable("id") String id) {
        ImageTask task = imageTaskService.getByTaskId(id);
        if (task == null) {
            return R.notFound("任务不存在");
        }
        return R.ok(task);
    }

    /**
     * 删除任务
     *
     * @param id 任务ID
     * @return 结果
     */
    @DeleteMapping("/{id}")
    public R<Void> deleteTask(@PathVariable("id") String id) {
        ImageTask task = imageTaskService.getByTaskId(id);
        if (task == null) {
            return R.notFound("任务不存在");
        }
        imageTaskService.removeById(task.getId());
        log.info("Admin deleted task: {}", id);
        return R.ok();
    }

    /**
     * 批量删除任务
     *
     * @param ids 任务ID列表
     * @return 结果
     */
    @DeleteMapping("/batch")
    public R<Void> deleteTasks(@RequestBody List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return R.badRequest("请选择要删除的任务");
        }
        for (String taskId : ids) {
            ImageTask task = imageTaskService.getByTaskId(taskId);
            if (task != null) {
                imageTaskService.removeById(task.getId());
            }
        }
        log.info("Admin batch deleted {} tasks", ids.size());
        return R.ok();
    }

    /**
     * 获取任务统计
     *
     * @return 统计数据
     */
    @GetMapping("/stats")
    public R<TaskStatsResponse> getTaskStats() {
        long total = imageTaskService.count();
        long pending = imageTaskService.lambdaQuery().eq(ImageTask::getStatus, "pending").count();
        long done = imageTaskService.lambdaQuery().eq(ImageTask::getStatus, "done").count();
        long error = imageTaskService.lambdaQuery().eq(ImageTask::getStatus, "error").count();

        TaskStatsResponse response = new TaskStatsResponse();
        response.setTotal(total);
        response.setPending(pending);
        response.setDone(done);
        response.setError(error);
        return R.ok(response);
    }

    /**
     * 任务分页响应
     */
    @Data
    public static class TaskPageResponse {
        private List<ImageTask> records;
        private Long total;
        private Long pages;
        private Long current;
        private Long size;
    }

    /**
     * 任务统计响应
     */
    @Data
    public static class TaskStatsResponse {
        private Long total;
        private Long pending;
        private Long done;
        private Long error;
    }
}
