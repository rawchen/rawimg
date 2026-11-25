package com.rawchen.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

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
     * <p>
     * <b>为什么是「固定线程池 + 小队列 + AbortPolicy」：</b>
     * <ol>
     *   <li>{@code ThreadPoolExecutor} 只有在<b>队列满了</b>之后才会把线程扩到 max，
     *       原配置 core=2 / max=5 / queue=100 的<b>真实并发只有 2</b>，
     *       要堆积 100 个任务后才会扩容；</li>
     *   <li>原 {@code CallerRunsPolicy} 会让<b>Tomcat 请求线程</b>同步跑完整个图片生成
     *       （单次最长可达 30 分钟），既拖垮 HTTP 线程池，又把图片字节压在 Web 线程上，
     *       并发一上来就是 RSS 暴涨 + OOM Killer 的直接诱因；</li>
     *   <li>现在 core == max == 4，真实并发固定可控；队列收敛到 16；
     *       队列满时立即 Abort，由调用方返回「系统繁忙」并退还费用，
     *       <b>绝不让 HTTP 线程代跑任务</b>。</li>
     * </ol>
     */
    @Bean("imageTaskExecutor")
    public ThreadPoolTaskExecutor imageTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 固定线程数：core == max，避免"队列不满就不扩容"导致实际并发只有 core
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        // 队列容量：原 100 过大（最坏堆积 100 个任务，长时间无人消费）
        executor.setQueueCapacity(16);
        // 线程名前缀
        executor.setThreadNamePrefix("image-task-");
        // 拒绝策略：立即拒绝并抛 RejectedExecutionException，交给调用方兜底。
        // 绝不使用 CallerRunsPolicy —— 调用方是 Tomcat HTTP 线程，会被整个生成过程拖住
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        // 线程空闲时间（秒）
        executor.setKeepAliveSeconds(60);
        // 核心线程空闲超时回收，释放线程栈与 glibc arena，降低常驻 RSS
        executor.setAllowCoreThreadTimeOut(true);
        // 等待任务完成后再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // 等待时间
        executor.setAwaitTerminationSeconds(300);
        executor.initialize();
        log.info("Image task executor initialized: core=4, max=4, queue=16, reject=AbortPolicy");
        return executor;
    }

    /**
     * OSS 上传专用线程池
     * <p>
     * 用于把多张图片并行上传到 OSS，避免占用 imageTaskExecutor 的业务线程。
     * 核心/最大线程数按"一次最多 8 张图并行"配置，可根据并发任务量调整。
     */
    @Bean("ossUploadExecutor")
    public ThreadPoolTaskExecutor ossUploadExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 核心线程数（常驻）
        executor.setCorePoolSize(4);
        // 最大线程数（峰值并发上传能力）
        executor.setMaxPoolSize(8);
        // 队列容量：原 200 过大 —— 队列中每个待上传任务都持有图片 byte[] 引用，
        // 200 个排队任务最坏可滞留数百 MB 内存，这里收敛到 16
        executor.setQueueCapacity(16);
        // 线程名前缀
        executor.setThreadNamePrefix("oss-upload-");
        // 拒绝策略：CallerRunsPolicy 在这里是安全的 —— 调用方是 image-task 专用线程，
        // 不是 HTTP 线程，兜底同步上传不会拖垮 Web 层，也不会丢任务
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // 线程空闲时间（秒）
        executor.setKeepAliveSeconds(60);
        // 核心线程空闲超时回收，降低常驻 RSS
        executor.setAllowCoreThreadTimeOut(true);
        // 等待任务完成后再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // 等待时间
        executor.setAwaitTerminationSeconds(120);
        executor.initialize();
        log.info("OSS upload executor initialized: core=4, max=8, queue=16");
        return executor;
    }
}
