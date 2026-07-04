package com.rawchen.websocket;

import com.rawchen.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Component
@RequiredArgsConstructor
public class OnlineUserService {

    private final ConfigService configService;

    // WebSocket session id -> session
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    // WebSocket session id -> clientId (browser unique id)
    private final Map<String, String> sessionToClientId = new ConcurrentHashMap<>();
    // Active clientIds (for counting unique browsers)
    private final Set<String> activeClientIds = ConcurrentHashMap.newKeySet();

    // Fake active count configuration keys
    private static final String FAKE_BASE_COUNT_KEY = "fake_active_base_count";
    private static final int MAX_FAKE_VARIATION = 5;

    // Fake count management
    private volatile int currentFakeCount = 0;
    private int targetFakeCount = 0;
    private long nextRefreshTime = 0;

    // Config cache
    private volatile int cachedBaseCount = 0;
    private long nextConfigRefreshTime = 0;
    private static final long CONFIG_REFRESH_INTERVAL = 60_000L; // 1分钟刷新一次配置

    @PostConstruct
    public void init() {
        refreshConfigCache();
        refreshFakeCount();
    }

    private void refreshConfigCache() {
        long currentTime = System.currentTimeMillis();
        if (currentTime >= nextConfigRefreshTime) {
            cachedBaseCount = configService.getConfigIntValue(FAKE_BASE_COUNT_KEY, 0);
            nextConfigRefreshTime = currentTime + CONFIG_REFRESH_INTERVAL;
        }
    }

    public void registerSession(WebSocketSession session, String clientId) {
        sessions.put(session.getId(), session);
        sessionToClientId.put(session.getId(), clientId);
        activeClientIds.add(clientId);
    }

    // Add session for receiving broadcasts, but not counted as online yet
    public void addPendingSession(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    public void sendCurrentCount(WebSocketSession session) {
        if (session.isOpen()) {
            try {
                int count = getOnlineCount();
                String message = String.format("{\"type\":\"online_count\",\"count\":%d}", count);
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                // Ignore
            }
        }
    }

    public void removeSession(WebSocketSession session) {
        String sessionId = session.getId();
        String clientId = sessionToClientId.remove(sessionId);
        sessions.remove(sessionId);

        // Only remove clientId if no other sessions use it
        if (clientId != null) {
            boolean hasOtherSession = sessionToClientId.containsValue(clientId);
            if (!hasOtherSession) {
                activeClientIds.remove(clientId);
            }
        }
    }

    public int getOnlineCount() {
        return activeClientIds.size() + currentFakeCount;
    }

    public int getRealOnlineCount() {
        return activeClientIds.size();
    }

    public int getFakeOnlineCount() {
        return currentFakeCount;
    }

    // Refresh fake active count with random interval and smooth transition
    @Scheduled(fixedRate = 5000)
    public void refreshFakeCount() {
        // Use cached config instead of querying database every time
        refreshConfigCache();
        int baseCount = cachedBaseCount;

        if (baseCount <= 0) {
            currentFakeCount = 0;
            targetFakeCount = 0;
            return;
        }

        long currentTime = System.currentTimeMillis();

        // Check if it's time for a major refresh (1-2 minutes random interval)
        if (currentTime >= nextRefreshTime) {
            // Set new target count with larger variation
            int minCount = Math.max(0, baseCount - MAX_FAKE_VARIATION);
            int maxCount = baseCount + MAX_FAKE_VARIATION;
            targetFakeCount = ThreadLocalRandom.current().nextInt(minCount, maxCount + 1);

            // Set next refresh time: 60-120 seconds with non-minute intervals
            int nextIntervalSeconds = 60 + ThreadLocalRandom.current().nextInt(61);
            nextRefreshTime = currentTime + (nextIntervalSeconds * 1000L) + (ThreadLocalRandom.current().nextInt(1000));
        }

        // Only update count periodically (20% chance each 5-second cycle = average every 25 seconds)
        if (ThreadLocalRandom.current().nextDouble() < 0.2) {
            int difference = targetFakeCount - currentFakeCount;

            if (Math.abs(difference) > 1) {
                // Smoothly transition towards target (step of 1-2)
                int step = Math.max(1, Math.min(Math.abs(difference), 2));
                currentFakeCount += difference > 0 ? step : -step;
            } else if (ThreadLocalRandom.current().nextDouble() < 0.15) {
                // Small random fluctuation (15% chance when near target)
                int fluctuation = ThreadLocalRandom.current().nextBoolean() ? 1 : -1;
                int newCount = currentFakeCount + fluctuation;
                if (Math.abs(newCount - targetFakeCount) <= 2) {
                    currentFakeCount = newCount;
                }
            }
        }
    }

    // Broadcast every 5 seconds
    @Scheduled(fixedRate = 5000)
    public void broadcastOnlineCount() {
        int count = getOnlineCount();
        String message = String.format("{\"type\":\"online_count\",\"count\":%d}", count);

        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    // Log error and continue
                }
            }
        }
    }

    public void broadcastMessage(String message) {
        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    // Log error and continue
                }
            }
        }
    }
}
