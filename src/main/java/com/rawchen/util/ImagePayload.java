package com.rawchen.util;

/**
 * GPT 图片接口返回的单张图片结果。
 * <p>
 * 承载两种互斥形态：
 * <ul>
 *     <li>{@link #ofUrl(String)} —— 中转站直接返回图片地址，走境外域名下载（慢路径）</li>
 *     <li>{@link #ofData(byte[], String)} —— 中转站返回 b64_json，这里直接持有解码后的原始图片字节（快路径）</li>
 * </ul>
 * <p>
 * <b>为什么不直接用 String 承载 base64？</b><br>
 * Java 8 的 String 底层是 char[]（1 字符 2 字节），一份 3.6MB 的 base64 文本转成 String
 * 立刻占用 7.2MB 堆内存。而 GPT 图片接口的响应链路上 base64 会被反复复制：
 * <pre>
 *   响应体 byte[] → body() 转 String → fastjson 解析再生成 String
 *                 → 拼接 "data:image/png;base64," 前缀 → 正则 split 再复制
 *                 → substring("base64,") 再复制
 * </pre>
 * 单张图会被放大到 50MB 以上，直接把 -Xmx512m 的堆打满。
 * 改为直接持有解码后的字节后，峰值只剩「响应字节数组 + 图片字节」约 6~7MB。
 */
public final class ImagePayload {

    /**
     * 图片地址（非 base64 返回时使用），否则为 null。
     */
    private final String url;

    /**
     * 图片原始字节（b64_json 返回时使用），否则为 null。
     */
    private final byte[] data;

    /**
     * 图片 MIME 类型，如 image/png。
     */
    private final String contentType;

    private ImagePayload(String url, byte[] data, String contentType) {
        this.url = url;
        this.data = data;
        this.contentType = contentType;
    }

    /**
     * 构建「图片地址」形态的结果。
     *
     * @param url 图片地址
     * @return 结果对象
     */
    public static ImagePayload ofUrl(String url) {
        return new ImagePayload(url, null, null);
    }

    /**
     * 构建「图片字节」形态的结果。
     *
     * @param data        图片原始字节
     * @param contentType 图片 MIME 类型
     * @return 结果对象
     */
    public static ImagePayload ofData(byte[] data, String contentType) {
        return new ImagePayload(null, data, contentType);
    }

    /**
     * 是否为地址形态。
     *
     * @return true 表示 {@link #getUrl()} 有值
     */
    public boolean isUrl() {
        return url != null;
    }

    /**
     * 是否为字节形态。
     *
     * @return true 表示 {@link #getData()} 有值
     */
    public boolean isData() {
        return data != null;
    }

    public String getUrl() {
        return url;
    }

    public byte[] getData() {
        return data;
    }

    public String getContentType() {
        return contentType;
    }

    /**
     * 图片字节数（地址形态返回 0）。
     *
     * @return 字节数
     */
    public int size() {
        return data == null ? 0 : data.length;
    }

    @Override
    public String toString() {
        if (isUrl()) {
            return "ImagePayload{url=" + url + '}';
        }
        return "ImagePayload{bytes=" + (data == null ? 0 : data.length)
                + ", contentType=" + contentType + '}';
    }
}
