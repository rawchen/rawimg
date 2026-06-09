package com.rawchen.util;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

public class CaptchaUtil {

    private static final Map<String, Integer> captchaStore = new ConcurrentHashMap<>();
    private static final Random random = new Random();

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

    public static boolean validateCaptcha(String sessionId, int answer) {
        Integer storedAnswer = captchaStore.get(sessionId);
        if (storedAnswer == null) {
            return false;
        }

        boolean isValid = storedAnswer == answer;
        captchaStore.remove(sessionId); // One-time use
        return isValid;
    }

    public static void removeCaptcha(String sessionId) {
        captchaStore.remove(sessionId);
    }
}
