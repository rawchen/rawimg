package com.rawchen.util;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

/**
 * 验证码工具类。
 * <p>
 * 验证码答案存放在带 TTL 的本地缓存（Caffeine）中，写入后固定时间自动淘汰，
 * 并且设置了最大条目数兜底。这样即使出现「拿到验证码却从未提交校验」的请求
 * （用户关掉页面、爬虫只取不校验、答案非数字抛异常等），条目也不会无限堆积，
 * 避免静态 Map 无界增长造成内存泄漏。
 */
public class CaptchaUtil {

    /**
     * 验证码有效期（分钟）。超过该时间未校验即失效。
     */
    private static final int EXPIRE_MINUTES = 5;

    /**
     * 本地缓存最大条目数，兜底防止异常场景下无限增长。
     */
    private static final long MAX_SIZE = 10_000L;

    /**
     * 验证码答案缓存。TTL 到期自动淘汰，单次校验后立即移除（一次性使用）。
     */
    private static final Cache<String, Integer> captchaStore = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(EXPIRE_MINUTES))
            .maximumSize(MAX_SIZE)
            .build();

    private static final Random random = new Random();

    /**
     * 生成验证码会话 ID。
     * <p>
     * 使用 UUID 而不是毫秒时间戳：时间戳在同一毫秒内的并发请求会撞车，
     * 导致后一个请求覆盖前一个的验证码答案（既造成验证码校验错乱，也让条目残留）。
     *
     * @return 形如 {@code captcha_1f0c...} 的唯一会话 ID
     */
    public static String newSessionId() {
        return "captcha_" + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 生成一道算术验证码，并记录其答案。
     *
     * @param sessionId 会话 ID，通常由 {@link #newSessionId()} 生成
     * @return 包含 question 与 sessionId 的结果
     */
    public static Map<String, Object> generateCaptcha(String sessionId) {
        int num1 = random.nextInt(9) + 1;
        int num2 = random.nextInt(9) + 1;
        boolean isAddition = random.nextBoolean();

        int answer;
        String question;

        if (isAddition) {
            answer = num1 + num2;
            question = num1 + " + " + num2 + " = ?";
        } else {
            // Ensure no negative results
            if (num1 < num2) {
                int temp = num1;
                num1 = num2;
                num2 = temp;
            }
            answer = num1 - num2;
            question = num1 + " - " + num2 + " = ?";
        }

        captchaStore.put(sessionId, answer);

        Map<String, Object> result = new HashMap<>();
        result.put("question", question);
        result.put("sessionId", sessionId);

        return result;
    }

    /**
     * 校验验证码答案。无论对错都立即失效（一次性使用）。
     *
     * @param sessionId 会话 ID
     * @param answer    用户提交的答案
     * @return 答案是否正确
     */
    public static boolean validateCaptcha(String sessionId, int answer) {
        // asMap().remove 是原子操作，避免并发下同一验证码被重复使用
        Integer storedAnswer = captchaStore.asMap().remove(sessionId);
        if (storedAnswer == null) {
            return false;
        }
        return storedAnswer == answer;
    }

    /**
     * 主动移除验证码（未提交校验时由调用方清理）。
     *
     * @param sessionId 会话 ID
     */
    public static void removeCaptcha(String sessionId) {
        if (sessionId != null) {
            captchaStore.invalidate(sessionId);
        }
    }
}
