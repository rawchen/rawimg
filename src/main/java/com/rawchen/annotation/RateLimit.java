package com.rawchen.annotation;

import java.lang.annotation.*;

/**
 * 限流注解
 * 基于IP地址进行限流
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RateLimit {
    
    /**
     * 限流key前缀
     */
    String key() default "rate_limit";
    
    /**
     * 时间窗口（秒）
     */
    int time() default 1;
    
    /**
     * 限制次数
     */
    int count() default 1;
    
    /**
     * 限流提示消息
     */
    String message() default "请求过于频繁，请稍后再试";
}
