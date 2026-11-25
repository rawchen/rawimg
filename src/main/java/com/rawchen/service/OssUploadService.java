package com.rawchen.service;

import com.rawchen.util.ImagePayload;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * OSS后端上传服务接口
 */
public interface OssUploadService {

    /**
     * 上传GPT 图片接口返回的结果到 OSS，并返回逗号分隔的 URL。
     * <p>
     * 之所以统一走 OSS 而不是把base64 以 data URI 的形式返回给前端：
     * data URI 需要把图片重新编码成 base64 字符串，而 Java 8 的 String 底层是 char[]
     * （1 字符 2 字节），一张 2.7MB 的图会因此再占用约 7.2MB 堆内存，
     * 且响应体本身也有数MB。上传 OSS 后返回的是一个短 URL，内存与带宽都更友好。
     *
     * @param payloads  图片结果列表
     * @param directory OSS 上传目录，如 image/create
     * @return 逗号分隔的 OSS URL
     */
    default String uploadImagePayloads(List<ImagePayload> payloads, String directory) {
        if (payloads == null || payloads.isEmpty()) {
            throw new RuntimeException("上传图片失败: 图片内容为空");
        }
        List<String> urls = new ArrayList<>(payloads.size());
        for (int i = 0; i < payloads.size(); i++) {
            ImagePayload payload = payloads.get(i);
            String fileName = directory + "/" + UUID.randomUUID().toString().replace("-", "") + "_" + i + ".jpeg";
            if (payload.isUrl()) {
                urls.add(uploadFromUrl(payload.getUrl(), fileName));
            } else {
                String contentType = payload.getContentType() == null ? "image/jpeg" : payload.getContentType();
                urls.add(uploadBytes(payload.getData(), contentType, fileName));
            }
        }
        return String.join(",", urls);
    }

    /**
     * 上传Base64图片到OSS
     *
     * @param base64Data Base64编码的图片数据（包含data:image/xxx;base64,前缀）
     * @param fileName   文件名（不含路径）
     * @return OSS完整URL
     */
    String uploadBase64Image(String base64Data, String fileName);

    /**
     * 直接上传图片字节到OSS。
     * <p>
     * 用于GPT 图片接口返回 b64_json 的场景：base64 在响应解析阶段就已经解码成字节，
     * 这里直接上传字节即可，避免 base64 文本在堆内再经历一次「String 化 + 解码」，
     * 单张图可省下约 10MB 的堆占用。
     *
     * @param data        图片原始字节
     * @param contentType 图片内容类型（如 image/jpeg）
     * @param fileName    文件名（不含路径）
     * @return OSS完整URL
     */
    String uploadBytes(byte[] data, String contentType, String fileName);

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
