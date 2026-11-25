package com.rawchen.util;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * GPT 图片接口响应解析器（字节级）。
 * <p>
 * 不使用 {@code response.body() + fastjson} 的原因：图片接口返回的 b64_json 动辄 3~4MB，
 * Java 8 的 String 底层是 char[]（1 字符 2 字节），一次转成 String 就翻倍到 7.2MB；
 * 再叠加 JSON 解析、data URI 拼接、正则 split 等环节，单张图会在堆里放大到 50MB 以上。
 * <p>
 * 这里直接在字节层面定位 {@code data} 数组中的 {@code b64_json} / {@code url} 字段：
 * <ul>
 *     <li>{@code b64_json}：从响应字节数组原地解码进目标 byte[]，全程不构造 base64 字符串</li>
 *     <li>{@code url}：体积很小，才转成 String</li>
 * </ul>
 * 内存表现：峰值 ≈ 响应字节数组 + 图片字节，约 6~7MB/张（改造前约 51MB/张）。
 */
final class GptImageResponseParser {

    /**
     * {@code "data"} 字段名。
     */
    private static final byte[] KEY_DATA = "\"data\"".getBytes(StandardCharsets.UTF_8);

    /**
     * {@code "b64_json"} 字段名。
     */
    private static final byte[] KEY_B64 = "\"b64_json\"".getBytes(StandardCharsets.UTF_8);

    /**
     * {@code "url"} 字段名。
     */
    private static final byte[] KEY_URL = "\"url\"".getBytes(StandardCharsets.UTF_8);

    /**
     * 读取响应流时单次扩容的初始容量。
     */
    private static final int INITIAL_CAPACITY = 8 * 1024;

    private GptImageResponseParser() {
    }

    /**
     * 解析响应流。
     *
     * @param in                 响应体输入流（异步模式下即网络流，未被 Hutool 预读入内存）
     * @param defaultContentType b64_json 场景的默认图片 MIME 类型
     * @return 图片结果列表；解析不到时返回空列表
     * @throws IOException 读取响应流失败
     */
    static List<ImagePayload> parse(InputStream in, String defaultContentType) throws IOException {
        if (in == null) {
            return new ArrayList<>();
        }
        // 手动扩容读取：避免 ByteArrayOutputStream.toByteArray() 的整份拷贝，
        // 也避免为了裁剪长度再复制一次响应体。
        byte[] buf = new byte[INITIAL_CAPACITY];
        int size = 0;
        int n;
        while ((n = in.read(buf, size, buf.length - size)) > 0) {
            size += n;
            if (size == buf.length) {
                byte[] next = new byte[buf.length << 1];
                System.arraycopy(buf, 0, next, 0, size);
                buf = next;
            }
        }
        return parse(buf, size, defaultContentType);
    }

    /**
     * 解析响应字节数组。
     *
     * @param body              响应字节数组
     * @param size              有效长度
     * @param defaultContentType b64_json 场景的默认图片 MIME 类型
     * @return 图片结果列表
     */
    static List<ImagePayload> parse(byte[] body, int size, String defaultContentType) {
        List<ImagePayload> result = new ArrayList<>();
        if (body == null || size <= 0) {
            return result;
        }

        int arrayStart = findDataArrayStart(body, size);
        if (arrayStart < 0) {
            return result;
        }

        int p = arrayStart + 1;
        while (p < size) {
            p = skipWhitespace(body, p, size);
            if (p >= size) {
                break;
            }
            byte c = body[p];
            if (c == ']') {
                break;
            }
            if (c == ',') {
                p++;
                continue;
            }
            if (c != '{') {
                p = skipValue(body, p, size);
                continue;
            }
            int objEnd = findObjectEnd(body, p, size);
            if (objEnd < 0) {
                break;
            }
            ImagePayload payload = readObject(body, p, objEnd, defaultContentType);
            if (payload != null) {
                result.add(payload);
            }
            p = objEnd + 1;
        }
        return result;
    }

    /**
     * 定位 {@code data} 数组的起始 {@code [} 位置。
     * <p>
     * 可能存在多个名字含 "data" 的键，因此需要逐个尝试，直到找到一个后面跟着数组的。
     *
     * @param body 响应字节数组
     * @param size 有效长度
     * @return {@code [} 的下标；找不到返回 -1
     */
    private static int findDataArrayStart(byte[] body, int size) {
        int from = 0;
        while (from < size) {
            int idx = indexOf(body, from, size, KEY_DATA);
            if (idx < 0) {
                return -1;
            }
            int valueStart = skipToValueStart(body, idx + KEY_DATA.length, size);
            if (valueStart >= 0 && body[valueStart] == '[') {
                return valueStart;
            }
            from = idx + KEY_DATA.length;
        }
        return -1;
    }

    /**
     * 解析 {@code data} 数组中的一个元素。
     * <p>
     * 与原 {@code extractImageData} 语义一致：优先 b64_json（免境外下载的快路径），
     * 没有 b64_json 才回退到 url。
     *
     * @param body              响应字节数组
     * @param start             元素起始下标（{@code {} 所在位置）
     * @param end               元素结束下标（不含）
     * @param defaultContentType b64_json 场景的默认 MIME 类型
     * @return 图片结果；元素内既无 b64_json 也无 url 时返回 null
     */
    private static ImagePayload readObject(byte[] body, int start, int end, String defaultContentType) {
        int b64Idx = indexOf(body, start, end, KEY_B64);
        if (b64Idx >= 0) {
            int valueStart = skipToValueStart(body, b64Idx + KEY_B64.length, end);
            if (valueStart >= 0 && body[valueStart] == '"') {
                int valueEnd = findStringEnd(body, valueStart + 1, end);
                if (valueEnd > valueStart + 1) {
                    byte[] decoded = decodeBase64(body, valueStart + 1, valueEnd);
                    if (decoded != null && decoded.length > 0) {
                        return ImagePayload.ofData(decoded, defaultContentType);
                    }
                }
            }
        }

        int urlIdx = indexOf(body, start, end, KEY_URL);
        if (urlIdx >= 0) {
            int valueStart = skipToValueStart(body, urlIdx + KEY_URL.length, end);
            if (valueStart >= 0 && body[valueStart] == '"') {
                int valueEnd = findStringEnd(body, valueStart + 1, end);
                if (valueEnd > valueStart + 1) {
                    String url = new String(body, valueStart + 1, valueEnd - valueStart - 1,
                            StandardCharsets.UTF_8);
                    return ImagePayload.ofUrl(url);
                }
            }
        }
        return null;
    }

    /**
     * 把 base64 文本解码成图片字节。
     * <p>
     * 自行实现解码而非调用 {@code Base64.Decoder}，原因有二：
     * <ul>
     *     <li>Java 8 的 {@code Base64.Decoder.decode(byte[], int, int, byte[])} 是包级私有，
     *         公开的区域解码重载要到 Java 9 才有；</li>
     *     <li>需要直接在响应字节数组的指定区间上解码，若先截取子数组会额外多出一份
     *         3.6MB 的 base64 拷贝，与「跳过 base64 文本化」的目标相悖。</li>
     * </ul>
     * 解码结果长度可由有效字符数精确算出，因此目标数组一次分配到位，全程零额外拷贝。
     *
     * @param src  源字节数组
     * @param from base64 起始下标（含）
     * @param to   base64 结束下标（不含）
     * @return 解码后的图片字节；解码失败返回 null
     */
    private static byte[] decodeBase64(byte[] src, int from, int to) {
        if (to <= from) {
            return null;
        }

        // 第一遍：统计有效 base64 字符数，用于精确计算输出长度
        int valid = 0;
        for (int i = from; i < to; i++) {
            byte b = src[i];
            if (b == '\\') {
                i++;
                continue;
            }
            if (base64Value(b) >= 0) {
                valid++;
            }
        }
        // 余 1 个字符是非法的 base64 长度
        if (valid == 0 || valid % 4 == 1) {
            return null;
        }
        int outLen = (valid / 4) * 3 + Math.max(0, valid % 4 - 1);

        // 第二遍：直接解进目标数组
        byte[] dst = new byte[outLen];
        int acc = 0;
        int bits = 0;
        int out = 0;
        for (int i = from; i < to; i++) {
            byte b = src[i];
            if (b == '\\') {
                i++;
                continue;
            }
            int v = base64Value(b);
            if (v < 0) {
                continue;
            }
            acc = (acc << 6) | v;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                dst[out++] = (byte) ((acc >>> bits) & 0xFF);
            }
        }
        return out == dst.length ? dst : Arrays.copyOf(dst, out);
    }

    /**
     * 取 base64 字符对应的 6 位值。
     *
     * @param b 字符字节
     * @return 0~63 的值；非 base64 字符返回 -1
     */
    private static int base64Value(byte b) {
        if (b < 0) {
            return -1;
        }
        char c = (char) b;
        if (c >= 'A' && c <= 'Z') {
            return c - 'A';
        }
        if (c >= 'a' && c <= 'z') {
            return c - 'a' + 26;
        }
        if (c >= '0' && c <= '9') {
            return c - '0' + 52;
        }
        if (c == '+') {
            return 62;
        }
        if (c == '/') {
            return 63;
        }
        return -1;
    }

    /**
     * 在字节数组中查找子串。
     *
     * @param body 源数组
     * @param from 起始下标（含）
     * @param to   结束下标（不含）
     * @param key  查找内容
     * @return 命中下标；未命中返回 -1
     */
    private static int indexOf(byte[] body, int from, int to, byte[] key) {
        int last = to - key.length;
        for (int i = from; i <= last; i++) {
            if (body[i] != key[0]) {
                continue;
            }
            int j = 1;
            while (j < key.length && body[i + j] == key[j]) {
                j++;
            }
            if (j == key.length) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 跳过空白与 {@code :} 分隔符，返回值的起始下标。
     *
     * @param body 源数组
     * @param from 起始下标
     * @param to   结束下标（不含）
     * @return 值的起始下标；没有找到返回 -1
     */
    private static int skipToValueStart(byte[] body, int from, int to) {
        int i = from;
        while (i < to) {
            byte b = body[i];
            if (b == ':' || b == ' ' || b == '\t' || b == '\n' || b == '\r') {
                i++;
                continue;
            }
            return i;
        }
        return -1;
    }

    /**
     * 跳过空白字符。
     *
     * @param body 源数组
     * @param from 起始下标
     * @param to   结束下标（不含）
     * @return 第一个非空白字符的下标
     */
    private static int skipWhitespace(byte[] body, int from, int to) {
        int i = from;
        while (i < to) {
            byte b = body[i];
            if (b == ' ' || b == '\t' || b == '\n' || b == '\r') {
                i++;
                continue;
            }
            break;
        }
        return i;
    }

    /**
     * 查找 JSON 字符串值的结束引号位置。
     *
     * @param body 源数组
     * @param from 字符串内容起始下标（开引号之后）
     * @param to   结束下标（不含）
     * @return 结束引号的下标；未找到返回 -1
     */
    private static int findStringEnd(byte[] body, int from, int to) {
        for (int i = from; i < to; i++) {
            byte b = body[i];
            if (b == '\\') {
                i++;
                continue;
            }
            if (b == '"') {
                return i;
            }
        }
        return -1;
    }

    /**
     * 查找 JSON 对象的结束大括号位置（跳过字符串内的括号）。
     *
     * @param body 源数组
     * @param from 对象起始下标（{@code {} 所在位置）
     * @param to   结束下标（不含）
     * @return 结束大括号的下标；未找到返回 -1
     */
    private static int findObjectEnd(byte[] body, int from, int to) {
        int depth = 0;
        for (int i = from; i < to; i++) {
            byte b = body[i];
            if (b == '"') {
                int close = findStringEnd(body, i + 1, to);
                if (close < 0) {
                    return -1;
                }
                i = close;
                continue;
            }
            if (b == '{') {
                depth++;
            } else if (b == '}') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * 跳过一个标量值。
     *
     * @param body 源数组
     * @param from 值起始下标
     * @param to   结束下标（不含）
     * @return 跳过后所在的下标
     */
    private static int skipValue(byte[] body, int from, int to) {
        int i = from;
        while (i < to) {
            byte b = body[i];
            if (b == '"') {
                int close = findStringEnd(body, i + 1, to);
                return close < 0 ? to : close + 1;
            }
            if (b == ',' || b == ']' || b == '}') {
                return i;
            }
            i++;
        }
        return to;
    }
}
