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
}
