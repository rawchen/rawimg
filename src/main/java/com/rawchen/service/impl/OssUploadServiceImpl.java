package com.rawchen.service.impl;

import com.aliyun.oss.ClientBuilderConfiguration;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.rawchen.config.OssConfig;
import com.rawchen.service.OssUploadService;
import javax.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Random;
import java.util.concurrent.atomic.AtomicReference;

/**
 * OSS后端上传服务实现
 * <p>
 * 性能优化：
 * 1. OSSClient 单例化（懒加载 + 线程安全），避免每次上传都新建/销毁 client。
 * 2. 复用连接池，减少 TCP/TLS 握手开销。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OssUploadServiceImpl implements OssUploadService {

    private final OssConfig ossConfig;

    /**
     * OSSClient 单例（懒加载，线程安全）。
     * 使用 AtomicReference + compareAndSet 实现无锁双重检查，避免 synchronized 带来的并发争用。
     */
    private final AtomicReference<OSS> ossClientRef = new AtomicReference<>();

    /**
     * 获取 OSSClient 单例。第一次调用时懒加载。
     */
    private OSS getOssClient() {
        OSS client = ossClientRef.get();
        if (client != null) {
            return client;
        }
        OSS newClient = createOssClient();
        if (ossClientRef.compareAndSet(null, newClient)) {
            log.info("OSSClient initialized: endpoint={}, bucket={}", ossConfig.getEndpoint(), ossConfig.getBucketName());
            return newClient;
        }
        // 并发场景下另一个线程已经初始化好了，关闭新建的实例并复用已有实例
        newClient.shutdown();
        return ossClientRef.get();
    }

    /**
     * 创建 OSSClient 实例，统一配置连接池与超时。
     */
    private OSS createOssClient() {
        ClientBuilderConfiguration cfg = new ClientBuilderConfiguration();
        // 长连接空闲超时（毫秒），默认 60s
        cfg.setIdleConnectionTime(60000);
        // 连接超时（毫秒）
        cfg.setConnectionTimeout(10000);
        // Socket 超时（毫秒）
        cfg.setSocketTimeout(30000);
        // 重试次数
        cfg.setMaxErrorRetry(3);
        return new OSSClientBuilder().build(
                ossConfig.getEndpoint(),
                ossConfig.getAccessKeyId(),
                ossConfig.getAccessKeySecret(),
                cfg
        );
    }

    @PreDestroy
    public void destroy() {
        OSS client = ossClientRef.getAndSet(null);
        if (client != null) {
            try {
                client.shutdown();
                log.info("OSSClient shutdown");
            } catch (Exception e) {
                log.warn("OSSClient shutdown error: {}", e.getMessage());
            }
        }
    }

    @Override
    public String uploadBase64Image(String base64Data, String fileName) {
        try {
            // 解析Base64数据
            String[] parts = base64Data.split(",");
            String imageData = parts.length > 1 ? parts[1] : parts[0];
            String contentType = "image/jpeg"; // 默认

            // 从前缀解析内容类型
            if (parts.length > 1 && parts[0].contains("data:image/")) {
                int start = parts[0].indexOf("data:image/") + 11;
                int end = parts[0].indexOf(";", start);
                if (end > start) {
                    contentType = "image/" + parts[0].substring(start, end);
                }
            }

            byte[] bytes = Base64.getDecoder().decode(imageData);
            InputStream inputStream = new ByteArrayInputStream(bytes);

            String objectKey = ossConfig.getUploadFolder() + "/" + fileName;
            uploadToOss(inputStream, objectKey, contentType, bytes.length);

            return buildFullUrl(objectKey);
        } catch (Exception e) {
            log.error("Upload base64 image failed: {}", e.getMessage());
            throw new RuntimeException("上传图片失败: " + e.getMessage());
        }
    }

    @Override
    public String uploadStream(InputStream inputStream, String fileName, String contentType) {
        try {
            String objectKey = ossConfig.getUploadFolder() + "/" + fileName;
            uploadToOss(inputStream, objectKey, contentType, -1);

            return buildFullUrl(objectKey);
        } catch (Exception e) {
            log.error("Upload stream failed: {}", e.getMessage());
            throw new RuntimeException("上传图片失败: " + e.getMessage());
        }
    }

    @Override
    public String uploadFromUrl(String imageUrl, String fileName) {
        try {
            URL url = new URL(imageUrl);
            // 设置Referer防止防盗链403
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            String referer = url.getProtocol() + "://" + url.getHost();
            connection.setRequestProperty("Referer", referer);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");
            InputStream inputStream = connection.getInputStream();

            // 尝试从URL推断内容类型
            String contentType = "image/jpeg";
            String path = url.getPath();
            if (path.endsWith(".png")) {
                contentType = "image/png";
            } else if (path.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (path.endsWith(".webp")) {
                contentType = "image/webp";
            }

            String objectKey = ossConfig.getUploadFolder() + "/" + fileName;
            uploadToOss(inputStream, objectKey, contentType, -1);

            inputStream.close();

            return buildFullUrl(objectKey);
        } catch (Exception e) {
            log.error("Upload from URL failed: {}", e.getMessage());
            throw new RuntimeException("上传图片失败: " + e.getMessage());
        }
    }

    @Override
    public String uploadFile(org.springframework.web.multipart.MultipartFile file, String folder) {
        try {
            String contentType = file.getContentType();
            if (contentType == null) {
                contentType = "image/jpeg";
            }

            // 根据内容类型确定扩展名
            String extension = ".jpg";
            if ("image/png".equals(contentType)) {
                extension = ".png";
            } else if ("image/gif".equals(contentType)) {
                extension = ".gif";
            } else if ("image/webp".equals(contentType)) {
                extension = ".webp";
            }

            // 生成文件名：时间戳_随机两位.扩展名
            String fileName = folder + generateFileNameWithExtension(extension);
            String objectKey = ossConfig.getUploadFolder() + "/" + fileName;

            InputStream inputStream = file.getInputStream();
            long contentLength = file.getSize();

            uploadToOss(inputStream, objectKey, contentType, contentLength);

            inputStream.close();

            return buildFullUrl(objectKey);
        } catch (Exception e) {
            log.error("Upload MultipartFile failed: {}", e.getMessage());
            throw new RuntimeException("上传图片失败: " + e.getMessage());
        }
    }

    @Override
    public String uploadFromUrlWithFolder(String imageUrl, String folder) {
        try {
            URL url = new URL(imageUrl);
            // 设置Referer防止防盗链403
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            String referer = url.getProtocol() + "://" + url.getHost();
            connection.setRequestProperty("Referer", referer);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");
            InputStream inputStream = connection.getInputStream();

            // 从URL推断内容类型和文件扩展名
            String contentType = "image/jpeg";
            String extension = ".jpg";
            String path = url.getPath();
            if (path.endsWith(".png")) {
                contentType = "image/png";
                extension = ".png";
            } else if (path.endsWith(".gif")) {
                contentType = "image/gif";
                extension = ".gif";
            } else if (path.endsWith(".webp")) {
                contentType = "image/webp";
                extension = ".webp";
            }

            // 生成文件名：时间戳_两位随机数字.扩展名
            String fileName = folder + generateFileNameWithExtension(extension);
            String objectKey = ossConfig.getUploadFolder() + "/" + fileName;

            uploadToOss(inputStream, objectKey, contentType, -1);

            inputStream.close();

            return buildFullUrl(objectKey);
        } catch (Exception e) {
            log.error("Upload from URL failed: {}", e.getMessage());
            throw new RuntimeException("上传图片失败: " + e.getMessage());
        }
    }

    /**
     * 构建完整的OSS URL
     */
    private String buildFullUrl(String objectKey) {
        String customDomain = ossConfig.getCustomDomain();
        // 确保有https://前缀
        if (!customDomain.startsWith("http://") && !customDomain.startsWith("https://")) {
            customDomain = "https://" + customDomain;
        }
        return customDomain + "/" + objectKey;
    }

    /**
     * 上传到OSS（复用单例 client）
     */
    private void uploadToOss(InputStream inputStream, String objectKey, String contentType, long contentLength) {
        OSS ossClient = getOssClient();
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(contentType);
        if (contentLength > 0) {
            metadata.setContentLength(contentLength);
        }
        // 单例 client 复用，不再调用 shutdown
        ossClient.putObject(ossConfig.getBucketName(), objectKey, inputStream, metadata);
        log.info("Uploaded to OSS: {}", objectKey);
    }

    /**
     * 生成唯一文件名：年月日时分秒_两位随机数字.jpg
     */
    public static String generateFileName() {
        return generateFileNameWithExtension(".jpg");
    }

    /**
     * 生成唯一文件名：年月日时分秒_两位随机数字.扩展名
     */
    public static String generateFileNameWithExtension(String extension) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmss");
        String timestamp = sdf.format(new java.util.Date());
        String random = String.format("%02d", new Random().nextInt(100));
        return timestamp + "_" + random + extension;
    }
}