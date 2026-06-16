package com.rawchen.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 阿里云OSS配置类
 */
@Data
@Component
@ConfigurationProperties(prefix = "aliyun.oss")
public class OssConfig {

    /**
     * OSS访问密钥ID
     */
    private String accessKeyId;

    /**
     * OSS访问密钥Secret
     */
    private String accessKeySecret;

    /**
     * RAM角色ARN
     */
    private String roleArn;

    /**
     * OSS Endpoint
     */
    private String endpoint;

    /**
     * Bucket名称
     */
    private String bucketName;

    /**
     * 自定义域名
     */
    private String customDomain;

    /**
     * STS临时凭证有效期（秒）
     */
    private Integer stsExpiration;

    /**
     * 上传文件夹前缀
     */
    private String uploadFolder;
}
