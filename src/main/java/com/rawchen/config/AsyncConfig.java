package com.rawchen.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 异步任务线程池配置
 */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * 图像任务专用线程池
     */
    @Bean("imageTaskExecutor")
    public Executor imageTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 核心线程数
        executor.setCorePoolSize(2);
        // 最大线程数
        executor.setMaxPoolSize(5);
        // 队列容量
        executor.setQueueCapacity(100);
        // 线程名前缀
        executor.setThreadNamePrefix("image-task-");
        // 拒绝策略：由调用线程处理
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // 线程空闲时间（秒）
        executor.setKeepAliveSeconds(60);
        // 等待任务完成后再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // 等待时间
        executor.setAwaitTerminationSeconds(300);
        executor.initialize();
        log.info("Image task executor initialized");
        return executor;
    }

    /**
     * OSS 上传专用线程池
     * <p>
     * 用于把多张图片并行上传到 OSS，避免占用 imageTaskExecutor 的业务线程。
     * 核心/最大线程数按"一次最多 8 张图并行"配置，可根据并发任务量调整。
     */
    @Bean("ossUploadExecutor")
    public Executor ossUploadExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 核心线程数（常驻）
        executor.setCorePoolSize(4);
        // 最大线程数（峰值并发上传能力）
        executor.setMaxPoolSize(8);
        // 队列容量（待上传任务排队）
        executor.setQueueCapacity(200);
        // 线程名前缀
        executor.setThreadNamePrefix("oss-upload-");
        // 拒绝策略：交给调用线程执行，避免任务丢失
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // 线程空闲时间（秒）
        executor.setKeepAliveSeconds(60);
        // 等待任务完成后再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // 等待时间
        executor.setAwaitTerminationSeconds(120);
        executor.initialize();
        log.info("OSS upload executor initialized");
        return executor;
    }
}
