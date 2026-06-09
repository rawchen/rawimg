package com.rawchen.util;

import lombok.extern.slf4j.Slf4j;
import org.lionsoul.ip2region.xdb.Searcher;
import org.lionsoul.ip2region.xdb.Version;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.servlet.http.HttpServletRequest;

@Slf4j
@Component
public class IpUtil {

    @Value("${ip2region.xdb}")
    private Resource xdbResource;

    private Searcher searcher;

    @PostConstruct
    public void init() {
        try {
            String dbPath = xdbResource.getFile().getAbsolutePath();
            log.info("ip db path: {}", dbPath);
            this.searcher = Searcher.newWithFileOnly(Version.IPv4, dbPath);
        } catch (Exception e) {
            log.error("ip db init error: {}", e.getMessage());
        }
    }

    public String getRegion(String ip) {
        if (ip == null || ip.isEmpty()) {
            return "Unknown";
        }

        // Skip local addresses
        if (ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1") || ip.startsWith("192.168.") ||
                ip.startsWith("10.") || ip.startsWith("172.")) {
            return "Local";
        }

        // For demo purposes, return a mock region
        // In production, integrate with IP2Region or MaxMind GeoIP2
        try {
            if (searcher == null) {
                return "IP2Region failed";
            }
            return searcher.search(ip);
        } catch (Exception e) {
            log.error("ip search error: {}", e.getMessage());
            return "Unknown";
//            throw new RuntimeException(e);
        }
    }

    public static String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // If multiple proxies, take the first IP
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }
}
