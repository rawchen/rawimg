package com.rawchen;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 启动类。
 * <p>
 * 在 main() 开头设置 JVM 系统属性，启用 HttpURLConnection 的 keep-alive 连接池。
 * 背景：项目中使用 Hutool 的 {@code HttpRequest} 发起 HTTP 调用，
 * 底层走 JDK {@link java.net.HttpURLConnection}。默认情况下连接池大小有限，
 * 且不会主动 keep-alive。设置以下属性后：
 *   - http.keepAlive=true   启用 keep-alive（默认就是 true，显式设置更可靠）
 *   - http.maxConnections=N 扩大每 host 的 keep-alive 连接池上限（默认 5）
 *   - sun.net.www.http.KeepAlive.remainingData=true 让读响应后立即把连接还回池
 * <p>
 * 收益：调用 GPT 中转站 / 下载 OSS 图片时，避免每次都重新 TCP+TLS 握手，
 * 单次可省 200~800ms，并发任务下累计可观。
 */
@SpringBootApplication
@EnableScheduling
@MapperScan("com.rawchen.mapper")
public class RawimgApplication {
    public static void main(String[] args) {
        configureHttpKeepAlive();
        SpringApplication.run(RawimgApplication.class, args);
    }

    private static void configureHttpKeepAlive() {
        // HttpURLConnection 的 keep-alive 设置
        System.setProperty("http.keepAlive", "true");
        // 每 host 最大 keep-alive 连接数（默认 5）。并发任务多时可适当调大。
        System.setProperty("http.maxConnections", "20");
        // 读完响应后立即把连接还回连接池（避免被服务端先关）
        System.setProperty("sun.net.www.http.KeepAlive.remainingData", "true");
    }
}
