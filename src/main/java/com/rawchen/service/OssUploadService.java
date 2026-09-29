package com.rawchen.service;

import java.io.InputStream;

/**
 * OSS后端上传服务接口
 */
public interface OssUploadService {

    /**
     * 上传Base64图片到OSS
     *
     * @param base64Data Base64编码的图片数据（包含data:image/xxx;base64,前缀）
     * @param fileName   文件名（不含路径）
     * @return OSS完整URL
     */
    String uploadBase64Image(String base64Data, String fileName);

    /**
     * 上传输入流到OSS
     *
     * @param inputStream 输入流
     * @param fileName    文件名（不含路径）
     * @param contentType 内容类型
     * @return OSS完整URL
     */
    String uploadStream(InputStream inputStream, String fileName, String contentType);

    /**
     * 上传URL指向的图片到OSS
     *
     * @param imageUrl  外部图片URL
     * @param fileName  文件名（不含路径）
     * @return OSS完整URL
     */
    String uploadFromUrl(String imageUrl, String fileName);

    /**
     * 上传MultipartFile到OSS指定文件夹
     *
     * @param file   上传的文件
     * @param folder 文件夹路径（如 "expand-mask/"）
     * @return OSS完整URL
     */
    String uploadFile(org.springframework.web.multipart.MultipartFile file, String folder);

    /**
     * 上传URL指向的图片到OSS指定文件夹
     *
     * @param imageUrl 外部图片URL
     * @param folder   文件夹路径（如 "expand-mask/"）
     * @return OSS完整URL
     */
    String uploadFromUrlWithFolder(String imageUrl, String folder);

    /**
     * 基于完整 URL 生成一个 OSS 临时签名 URL（带过期时间），供第三方服务拉取图片。
     * <p>
     * 用法场景：调用方拿到的是 OSS 公开访问 URL，但 bucket 是私有的，
     * 需要给出一个临时可访问的 URL 给外部系统（比如 GPT 中转站）下载图片。
     *
     * @param fullUrl        完整的访问 URL（customDomain + objectKey 形式）
     * @param expireSeconds  过期秒数，建议 300~600 秒
     * @return 带签名的完整 URL
     */
    String generatePresignedUrl(String fullUrl, int expireSeconds);
}
