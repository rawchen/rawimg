package com.rawchen.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis配置类
 */
@Configuration
public class RedisConfig {

    /**
     * key 与 value 统一使用 String 序列化。
     * <p>
     * 注意：value 不能使用 {@code GenericJackson2JsonRedisSerializer}。
     * 该序列化器会写入带类型信息的 JSON（如 {@code ["java.lang.String","1"]}），
     * 限流计数这类需要 Redis {@code INCR} 自增的 key 会因此报错
     * {@code ERR value is not an integer or out of range}。
     * <p>
     * 项目内所有 Redis 值（限流计数、邮箱验证码、音乐列表 JSON）本身就是字符串，
     * 使用 String 序列化既能保证 INCR 可用，也方便在 redis-cli 中直接查看。
     */
    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
