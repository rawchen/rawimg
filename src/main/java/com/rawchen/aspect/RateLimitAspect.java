package com.rawchen.aspect;

import com.rawchen.annotation.RateLimit;
import com.rawchen.entity.R;
import com.rawchen.util.IpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

/**
 * 限流切面
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RedisTemplate<String, String> redisTemplate;

    @Around("@annotation(com.rawchen.annotation.RateLimit)")
    public Object around(ProceedingJoinPoint point) throws Throwable {
        MethodSignature signature = (MethodSignature) point.getSignature();
        Method method = signature.getMethod();
        RateLimit rateLimit = method.getAnnotation(RateLimit.class);

        if (rateLimit == null) {
            return point.proceed();
        }

        String key = rateLimit.key();
        int time = rateLimit.time();
        int count = rateLimit.count();
        String message = rateLimit.message();

        // 获取当前请求
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return point.proceed();
        }
        HttpServletRequest request = attributes.getRequest();

        // 获取客户端IP
        String ip = IpUtil.getClientIp(request);

        // 组装redis key
        String redisKey = key + ":" + ip;

        try {
            // INCR 原子自增，返回自增后的次数（避免 get + increment 之间的并发竞态）
            Long current = redisTemplate.opsForValue().increment(redisKey);
            if (current == null) {
                return point.proceed();
            }

            // 第一次访问，设置过期时间
            if (current == 1L) {
                redisTemplate.expire(redisKey, time, TimeUnit.SECONDS);
            }

            // 超过阈值则限流
            if (current > count) {
                log.warn("IP {} 触发限流: {}", ip, redisKey);
                return R.badRequest(message);
            }
        } catch (DataAccessException e) {
            // Redis 不可用，或计数器存在脏数据（如旧序列化格式写入的值导致 INCR 失败）：
            // 清理脏数据并降级放行，避免整个接口直接返回 500
            log.warn("限流计数异常(redisKey={})，降级放行: {}", redisKey, e.getMessage());
            safeDelete(redisKey);
        }

        return point.proceed();
    }

    /**
     * 安全删除 key，删除失败不抛出异常。
     *
     * @param redisKey 限流 key
     */
    private void safeDelete(String redisKey) {
        try {
            redisTemplate.delete(redisKey);
        } catch (Exception e) {
            log.debug("清理限流 key 失败: {}", redisKey, e);
        }
    }
}
