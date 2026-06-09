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

        // 获取当前访问次数
        String value = redisTemplate.opsForValue().get(redisKey);
        int currentCount = value == null ? 0 : Integer.parseInt(value);

        if (currentCount >= count) {
            log.warn("IP {} 触发限流: {}", ip, redisKey);
            return R.badRequest(message);
        }

        // 第一次访问，设置过期时间
        if (currentCount == 0) {
            redisTemplate.opsForValue().set(redisKey, "1", time, TimeUnit.SECONDS);
        } else {
            // 后续访问，计数+1
            redisTemplate.opsForValue().increment(redisKey);
        }

        return point.proceed();
    }
}
