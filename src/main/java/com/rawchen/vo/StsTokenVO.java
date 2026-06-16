package com.rawchen.vo;

import lombok.Builder;
import lombok.Data;

/**
 * OSS STS临时凭证响应
 */
@Data
@Builder
public class StsTokenVO {

    /**
     * 临时访问密钥ID
     */
    private String accessKeyId;

    /**
     * 临时访问密钥Secret
     */
    private String accessKeySecret;

    /**
     * 安全令牌
     */
    private String securityToken;

    /**
     * 过期时间
     */
    private String expiration;

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
     * 上传文件夹前缀
     */
    private String uploadFolder;

    /**
     * 区域
     */
    private String region;
}
