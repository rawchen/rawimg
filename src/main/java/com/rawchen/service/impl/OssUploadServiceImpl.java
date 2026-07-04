package com.rawchen.service.impl;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.rawchen.config.OssConfig;
import com.rawchen.service.OssUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Random;

/**
 * OSS后端上传服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OssUploadServiceImpl implements OssUploadService {

    private final OssConfig ossConfig;

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
            InputStream inputStream = url.openStream();

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
            InputStream inputStream = url.openStream();

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
     * 上传到OSS
     */
    private void uploadToOss(InputStream inputStream, String objectKey, String contentType, long contentLength) {
        OSS ossClient = new OSSClientBuilder().build(
                ossConfig.getEndpoint(),
                ossConfig.getAccessKeyId(),
                ossConfig.getAccessKeySecret()
        );

        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType(contentType);
            if (contentLength > 0) {
                metadata.setContentLength(contentLength);
            }
            ossClient.putObject(ossConfig.getBucketName(), objectKey, inputStream, metadata);
            log.info("Uploaded to OSS: {}", objectKey);
        } finally {
            ossClient.shutdown();
        }
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