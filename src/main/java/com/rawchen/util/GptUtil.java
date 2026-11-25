package com.rawchen.util;

import cn.hutool.core.io.FileUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import com.alibaba.fastjson.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * GPT图像处理工具类
 */
@Slf4j
@Component
public class GptUtil {

    @Value("${gpt.image.api-url}")
    private String apiUrl;

    @Value("${gpt.image.api-key}")
    private String apiKey;

    @Value("${gpt.image.api-key-hr}")
    private String apiKeyHr;

    @Value("${gpt.image.model}")
    private String model;

    /**
     * 判断尺寸是否为高分辨率(2K/4K)
     */
    private boolean isHighResolution(String size) {
        if (size == null || size.isEmpty()) {
            return false;
        }
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                // 2K: 2560x1440, 4K: 3840x2160 等高分辨率
                return width >= 2048 || height >= 2048;
            }
        } catch (NumberFormatException ignored) {
        }
        return false;
    }

    /**
     * 判断是否为2K分辨率
     */
    private boolean is2K(String size) {
        if (size == null || size.isEmpty()) return false;
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                return (width == 2560 && height == 1440) || (width == 1440 && height == 2560);
            }
        } catch (NumberFormatException ignored) {}
        return false;
    }

    /**
     * 判断是否为4K分辨率
     */
    private boolean is4K(String size) {
        if (size == null || size.isEmpty()) return false;
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                return (width == 3840 && height == 2160) || (width == 2160 && height == 3840);
            }
        } catch (NumberFormatException ignored) {}
        return false;
    }

    /**
     * 判断是否为nano模型
     */
    private boolean isNanoModel(String modelParam) {
        if (modelParam == null) return false;
        return modelParam.startsWith("gemini") || modelParam.startsWith("nano");
    }

    /**
     * 获取实际的模型名称（nano模型根据分辨率调整）
     */
    private String getEffectiveModel(String modelParam, String size) {
        if (modelParam == null) return model;
        if (!isNanoModel(modelParam)) return modelParam;

        // nano模型根据分辨率调整模型名
        if (is4K(size)) {
            return "gemini-3.1-flash-image-preview-4k";
        } else if (is2K(size)) {
            return "gemini-3.1-flash-image-preview-2k";
        }
        return "gemini-2.5-flash-image";
    }

    /**
     * 根据模型和分辨率获取用于价格查询的模型代码（公共静态方法）
     * 用于前端和后端统一计算实际使用的模型
     */
    public static String getEffectiveModelCode(String model, String size) {
        if (model == null) return "gpt-image-2";

        // gpt-image-2 根据分辨率返回不同价格模型
        if (model.equals("gpt-image-2")) {
            if (size != null) {
                if (is4KStatic(size)) {
                    return "gpt-image-2-4k";
                } else if (is2KStatic(size)) {
                    return "gpt-image-2-2k";
                }
            }
            return "gpt-image-2";
        }

        // nano 模型根据分辨率调整
        if (model.equals("gemini-2.5-flash-image")) {
            if (size != null) {
                if (is4KStatic(size)) {
                    return "gemini-3.1-flash-image-preview-4k";
                } else if (is2KStatic(size)) {
                    return "gemini-3.1-flash-image-preview-2k";
                }
            }
            return "gemini-2.5-flash-image";
        }

        return model;
    }

    /**
     * 静态方法：判断是否为4K分辨率
     */
    private static boolean is4KStatic(String size) {
        if (size == null || size.isEmpty()) return false;
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                return (width == 3840 && height == 2160) || (width == 2160 && height == 3840);
            }
        } catch (NumberFormatException ignored) {}
        return false;
    }

    /**
     * 静态方法：判断是否为2K分辨率
     */
    private static boolean is2KStatic(String size) {
        if (size == null || size.isEmpty()) return false;
        try {
            String[] parts = size.split("x");
            if (parts.length == 2) {
                int width = Integer.parseInt(parts[0]);
                int height = Integer.parseInt(parts[1]);
                return (width == 2560 && height == 1440) || (width == 1440 && height == 2560);
            }
        } catch (NumberFormatException ignored) {}
        return false;
    }

    /**
     * 根据尺寸和模型获取对应的API Key
     * nano模型始终使用默认apiKey，其他模型高分辨率使用apiKeyHr
     */
    private String getApiKeyBySizeAndModel(String size, String modelParam) {
        if (isNanoModel(modelParam)) {
            return apiKey; // nano模型始终使用默认key
        }
        return isHighResolution(size) ? apiKeyHr : apiKey;
    }

    @Value("${oss.custom-domain:cdn.rawchen.com}")
    private String cdnDomain;

    /**
     * 调用GPT图像编辑API增强图片
     *
     * @param file   上传的图片文件
     * @param prompt 增强提示词
     * @return 增强后的图片结果（图片地址或图片字节）
     */
    public List<ImagePayload> enhanceImage(MultipartFile file, String prompt) {
        File tempFile = null;
        try {
            // 将MultipartFile转为临时文件
            tempFile = File.createTempFile("gpt_upload_", "_" + file.getOriginalFilename());
            file.transferTo(tempFile);

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", tempFile)
                    .form("model", model)
                    .form("prompt", prompt)
                    .timeout(120000);

            // GPT image edit response: { "data": [ { "url": "..." } ] } or { "data": [ { "b64_json": "..." } ] }
            return executeAndParseImages(request, "image/png", "image", "图像增强失败");
        } catch (IOException e) {
            log.error("GPT image API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                FileUtil.del(tempFile);
            }
        }
    }

    /**
     * 调用GPT图像扩展API - 扩展图片边界
     *
     * @param imageUrl 合成图片URL（白色背景+原图按位置摆放）
     * @param maskUrl  遮罩图片URL（原图部分黑色#000000，扩展部分白色#ffffff）
     * @param size     扩展后的图片尺寸
     * @param model    使用的模型名称
     * @return 扩展后的图片结果（图片地址或图片字节）
     */
    public List<ImagePayload> expandImage(String imageUrl, String maskUrl, String size, String model) {
        // 固定提示词，不暴露给前端
        String prompt = "自然地扩展图像边界，保持风格和内容的连贯性，生成与原图风格一致的背景内容，原图保持不变";

        File imageFile = null;
        File maskFile = null;
        try {
            // 从URL下载图片到临时文件
            imageFile = downloadUrlToFile(imageUrl, "gpt_image_");
//            maskFile = downloadUrlToFile(maskUrl, "gpt_mask_");

            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveApiKey = getApiKeyBySizeAndModel(size, model);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("image", imageFile)
                    .form("mask", maskUrl)
                    .form("model", model)
                    .form("input_fidelity", "high")
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            // 添加尺寸参数
            if (size != null && !size.isEmpty()) {
                request.form("size", size);
            }

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT image expand API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT image expand API error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("图像扩展失败: " + status);
                }
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/png");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT image expand API unexpected response: no image found");
                throw new RuntimeException("图像扩展失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (Exception e) {
            log.error("GPT image expand API error: {}", e.getMessage());
            throw new RuntimeException("图像扩展失败: " + e.getMessage());
        } finally {
            if (imageFile != null && imageFile.exists()) {
                FileUtil.del(imageFile);
            }
            if (maskFile != null && maskFile.exists()) {
                FileUtil.del(maskFile);
            }
        }
    }

    /**
     * 调用GPT图像局部改图API - 使用mask修改指定区域
     *
     * @param imageUrl 原始图片URL
     * @param maskUrl  遮罩图片URL（纯色选区+透明背景）
     * @param prompt   编辑提示词
     * @param model    使用的模型名称
     * @return 编辑后的图片结果（图片地址或图片字节）
     */
    public List<ImagePayload> inpaintImage(String imageUrl, String maskUrl, String prompt, String model) {
        File imageFile = null;
        File maskFile = null;
        try {
            // 从URL下载图片到临时文件
            imageFile = downloadUrlToFile(imageUrl, "gpt_inpaint_");
            maskFile = downloadUrlToFile(maskUrl, "gpt_inpaint_");

            // 添加预制提示词，确保AI模型理解是局部修改
            String fullPrompt = "请完成对MASK遮罩Alpha像素的操作：" + prompt + "。不能改变选区以外任意地方的像素，保持原图的风格和内容连贯性。";

            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveApiKey = getApiKeyBySizeAndModel(null, model);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("image", imageFile)
                    .form("mask", maskFile)
                    .form("model", model)
                    .form("prompt", fullPrompt)
                    .form("input_fidelity", "high")
                    .timeout(10 * 60 * 1000);

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT inpaint API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT inpaint API error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("局部改图失败: " + status);
                }
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/png");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT inpaint API unexpected response: no image found");
                throw new RuntimeException("局部改图失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (Exception e) {
            log.error("GPT inpaint API error: {}", e.getMessage());
            throw new RuntimeException("局部改图失败: " + e.getMessage());
        } finally {
            if (imageFile != null && imageFile.exists()) {
                FileUtil.del(imageFile);
            }
            if (maskFile != null && maskFile.exists()) {
                FileUtil.del(maskFile);
            }
        }
    }

    /**
     * 调用GPT图像抠图API - 移除背景
     *
     * @param file   上传的图片文件
     * @param prompt 抠图提示词
     * @param model  使用的模型名称
     * @return 抠图后的图片结果（图片地址或图片字节）
     */
    public List<ImagePayload> mattingImage(MultipartFile file, String prompt, String model) {
        File tempFile = null;
        try {
            // 将MultipartFile转为临时文件
            tempFile = File.createTempFile("gpt_matting_", "_" + file.getOriginalFilename());
            file.transferTo(tempFile);

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", tempFile)
                    .form("model", model)
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT matting API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT matting API error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("图像抠图失败: " + status);
                }
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/png");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT matting API unexpected response: no image found");
                throw new RuntimeException("图像抠图失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (IOException e) {
            log.error("GPT matting API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                FileUtil.del(tempFile);
            }
        }
    }

    /**
     * 调用GPT图像修复API - 老照片修复
     *
     * @param file   上传的图片文件
     * @param prompt 修复提示词
     * @param model  使用的模型名称
     * @return 修复后的图片结果（图片地址或图片字节）
     */
    public List<ImagePayload> restoreImage(MultipartFile file, String prompt, String model) {
        File tempFile = null;
        try {
            // 将MultipartFile转为临时文件
            tempFile = File.createTempFile("gpt_restore_", "_" + file.getOriginalFilename());
            file.transferTo(tempFile);

            String fullUrl = apiUrl + "/v1/images/edits";
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .form("image", tempFile)
                    .form("model", model)
                    .form("prompt", prompt)
                    .timeout(10 * 60 * 1000);

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT restore API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT restore API error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("老照片修复失败: " + status);
                }
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/jpeg");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT restore API unexpected response: no image found");
                throw new RuntimeException("老照片修复失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (IOException e) {
            log.error("GPT restore API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                FileUtil.del(tempFile);
            }
        }
    }

    /**
     * 执行图片接口请求并解析出图片结果。
     * <p>
     * 相比原来的 {@code response.body() + fastjson} 做法，这里有两点关键变化：
     * <ol>
     *     <li>使用异步模式执行，响应体不会被 Hutool 预读进内存，而是直接从网络流按字节解析；</li>
     *     <li>base64 文本全程不转成 String，直接在响应字节数组上解码成图片字节。</li>
     * </ol>
     * 原因：Java 8 的 String 底层是 char[]（1 字符 2 字节），一份 3.6MB 的 base64 文本
     * 转成 String 就占 7.2MB；而旧链路里 base64 会被反复复制（响应体 → JSON 解析 →
     * 拼 data URI → 正则 split → substring），单张图能放大到 50MB 以上，直接打满 -Xmx512m 的堆。
     * 改造后单张图峰值约 6~7MB。
     * <p>
     * 字段语义与旧的 {@code extractImageData} 保持一致：优先 b64_json（免境外下载的快路径），
     * 没有才回退到 url。
     *
     * @param request      已构建好的请求
     * @param defaultMime  b64_json 场景的默认 MIME（image/png / image/jpeg）
     * @param scene        场景标识，仅用于日志
     * @param errorMessage 失败时的异常提示前缀
     * @return 图片结果列表（至少一个）
     * @throws IOException 读写响应流失败
     */
    private List<ImagePayload> executeAndParseImages(HttpRequest request, String defaultMime,
                                                       String scene, String errorMessage) throws IOException {
        // executeAsync：响应体不预读入内存，bodyStream() 直接返回网络流
        HttpResponse response = request.executeAsync();
        try {
            int status = response.getStatus();
            log.info("GPT {} API response status: {}", scene, status);
            if (!response.isOk()) {
                log.error("GPT {} API error: status={}, body={}", scene, status, readErrorBody(response));
                throw new RuntimeException(errorMessage + ": " + status);
            }
            List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), defaultMime);
            if (payloads.isEmpty()) {
                log.error("GPT {} API unexpected response: no image found", scene);
                throw new RuntimeException(errorMessage + "，API返回异常");
            }
            return payloads;
        } finally {
            // 异步模式下 bodyStream() 是真实的网络流，必须显式关闭（同时会断开底层连接）
            response.close();
        }
    }

    /**
     * 读取错误响应体。错误响应体通常很小，只取前若干字节用于日志。
     *
     * @param response HTTP 响应
     * @return 错误响应体文本
     */
    private String readErrorBody(HttpResponse response) {
        try {
            java.io.InputStream in = response.bodyStream();
            if (in == null) {
                return "";
            }
            byte[] buf = new byte[4096];
            int n = in.read(buf, 0, buf.length);
            return n > 0 ? new String(buf, 0, n, java.nio.charset.StandardCharsets.UTF_8) : "";
        } catch (IOException e) {
            return "<读取失败: " + e.getMessage() + ">";
        }
    }

    /**
     * 从URL下载文件到临时文件
     */
    private File downloadUrlToFile(String url, String prefix) throws IOException {
        // 从URL中提取文件扩展名
        String extension = ".png";
        int lastDot = url.lastIndexOf('.');
        int queryIndex = url.indexOf('?', lastDot);
        if (lastDot > 0) {
            if (queryIndex > lastDot) {
                extension = url.substring(lastDot, queryIndex);
            } else if (queryIndex == -1) {
                extension = url.substring(lastDot);
            }
        }
        if (extension.length() > 5) {
            extension = extension.substring(0, 5);
        }

        File tempFile = File.createTempFile(prefix, extension);

        int maxRetries = 3;
        Exception lastException = null;

        for (int i = 0; i < maxRetries; i++) {
            try {
                HttpRequest.get(url)
                        .header("Referer", "https://" + cdnDomain + "/")
                        .timeout(60000)
                        .execute()
                        .writeBody(tempFile);

                if (tempFile.length() > 0) {
                    log.info("Downloaded file from {}, size: {} bytes", url, tempFile.length());
                    return tempFile;
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("Download attempt {} failed: {}", i + 1, e.getMessage());
            }
            if (i < maxRetries - 1) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ignored) {}
            }
        }

        throw new IOException("无法下载文件: " + url + (lastException != null ? ", " + lastException.getMessage() : ""));
    }

    /**
     * 调用GPT图像编辑API - 支持多图上传
     *
     * @param files  上传的图片文件列表（最多5张）
     * @param prompt 编辑提示词
     * @param size   图片尺寸
     * @param modelParam 使用的模型（可选）
     * @param n 生成图片数量（可选，默认1）
     * @return 生成的图片结果列表
     */
    public List<ImagePayload> editImage(List<MultipartFile> files, String prompt, String size, String modelParam, Integer n) {
        List<File> tempFiles = new ArrayList<>();
        try {
            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveModel = getEffectiveModel(modelParam, size);
            String effectiveApiKey = getApiKeyBySizeAndModel(size, modelParam);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("model", effectiveModel)
                    .form("prompt", prompt)
                    .timeout(30 * 60 * 1000);

            // 添加多张图片
            for (MultipartFile file : files) {
                File tempFile = File.createTempFile("gpt_upload_", "_" + file.getOriginalFilename());
                file.transferTo(tempFile);
                tempFiles.add(tempFile);
                request.form("image", tempFile);
            }

            // 添加尺寸参数（可选）
            if (size != null && !size.isEmpty()) {
                request.form("size", size);
            }

            // 添加n参数（可选）
            if (n != null && n > 1) {
                request.form("n", n);
            }

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT image edit API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT image edit API error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("图像编辑失败: " + status);
                }
                // 处理多图返回
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/png");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT image edit API unexpected response: no image found");
                throw new RuntimeException("图像编辑失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (IOException e) {
            log.error("GPT image edit API IO error: {}", e.getMessage());
            throw new RuntimeException("图像上传失败: " + e.getMessage());
        } finally {
            for (File tempFile : tempFiles) {
                if (tempFile != null && tempFile.exists()) {
                    FileUtil.del(tempFile);
                }
            }
        }
    }

    /**
     * 调用GPT图像编辑API（URL模式）—— 让中转站自己下载参考图，避免本服务做"下载→再上传"的来回传输。
     * <p>
     * 与 {@link #editImage(List, String, String, String, Integer)} 的区别：
     *   - editImage：先把参考图从 OSS 下载到本服务内存，再 multipart 上传到中转站（双向传输）
     *   - editImageByUrls：直接把参考图 URL（带签名）传给中转站，让中转站自己下载（单向：本服务→中转站只有 JSON）
     * <p>
     * 性能收益：省去本服务下载参考图 + 上传参考图到中转站两段大文件传输，预期可省 30~120 秒/任务。
     * <p>
     * 要求：
     *   1. 中转站必须支持 multipart form 字段传 URL（参考 expandImage 中的 mask 字段）
     *   2. 传入的 URL 必须可被中转站访问（OSS 私有 bucket 需要先签名）
     *
     * @param imageUrls   参考图的 OSS 签名 URL 列表（中转站可直接下载的 URL）
     * @param prompt      编辑提示词
     * @param size        图片尺寸
     * @param modelParam  使用的模型（可选）
     * @param n           生成图片数量（可选，默认1）
     * @return 生成的图片结果列表
     */
    public List<ImagePayload> editImageByUrls(List<String> imageUrls, String prompt, String size, String modelParam, Integer n) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            throw new IllegalArgumentException("imageUrls 不能为空");
        }
        try {
            String fullUrl = apiUrl + "/v1/images/edits";
            String effectiveModel = getEffectiveModel(modelParam, size);
            String effectiveApiKey = getApiKeyBySizeAndModel(size, modelParam);
            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .form("model", effectiveModel)
                    .form("prompt", prompt)
                    .timeout(30 * 60 * 1000);

            // 直接把 URL 作为 image 字段传给中转站（参考 expandImage 中 mask 的传法）。
            // 多张参考图用 image[] 形式提交。
            for (String imageUrl : imageUrls) {
                request.form("image", imageUrl);
            }

            if (size != null && !size.isEmpty()) {
                request.form("size", size);
            }

            if (n != null && n > 1) {
                request.form("n", n);
            }

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT image edit (url-mode) API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT image edit (url-mode) error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("图像编辑失败: " + status);
                }
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/png");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT image edit (url-mode) unexpected response: no image found");
                throw new RuntimeException("图像编辑失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (Exception e) {
            log.error("GPT image edit (url-mode) failed: {}", e.getMessage());
            throw new RuntimeException("图像编辑失败: " + e.getMessage());
        }
    }

    /**
     * 调用GPT图像生成API - 纯文字生成图片
     *
     * @param prompt 生成提示词
     * @param size   图片尺寸（如：1024x1024, 2160x3840）
     * @param modelParam 使用的模型（可选）
     * @param n 生成图片数量（可选，默认1）
     * @return 生成的图片结果列表
     */
    public List<ImagePayload> generateImage(String prompt, String size, String modelParam, Integer n) {
        try {
            String fullUrl = apiUrl + "/v1/images/generations";
            String effectiveModel = getEffectiveModel(modelParam, size);
            String effectiveApiKey = getApiKeyBySizeAndModel(size, modelParam);

            JSONObject requestBody = new JSONObject();
            requestBody.put("model", effectiveModel);
            requestBody.put("prompt", prompt);
            // 如果n参数大于1，则设置n值，否则默认为1
            requestBody.put("n", (n != null && n > 1) ? n : 1);
            if (size != null && !size.isEmpty()) {
                requestBody.put("size", size);
            }
            requestBody.put("output_format", "jpeg");
            // 关键优化：要求中转站返回 base64 而非 URL。
            // 中转站返回的 URL（如 image.openai-hub.net）走境外域名，
            // 从中国大陆服务器下载 2.7MB 实测 4 分多钟（速度 ~11KB/s）。
            // 返回 base64 后直接走 JSON 响应同一连接，速度提升数十倍。
            // 中转站若不支持此参数，会忽略/报错，下方有降级逻辑。
            requestBody.put("response_format", "b64_json");

            HttpRequest request = HttpRequest.post(fullUrl)
                    .header("Authorization", "Bearer " + effectiveApiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody.toJSONString())
                    .timeout(30 * 60 * 1000);

            HttpResponse response = request.executeAsync();
            try {
                int status = response.getStatus();
                log.info("GPT image generation API response status: {}", status);

                if (!response.isOk()) {
                    log.error("GPT image generation API error: status={}, body={}", status, readErrorBody(response));
                    throw new RuntimeException("图像生成失败: " + status);
                }
                // 处理多图返回
                List<ImagePayload> payloads = GptImageResponseParser.parse(response.bodyStream(), "image/jpeg");
                if (!payloads.isEmpty()) {
                    return payloads;
                }
                log.error("GPT image generation API unexpected response: no image found");
                throw new RuntimeException("图像生成失败，API返回异常");
            } finally {
                response.close();
            }
        } catch (Exception e) {
            log.error("GPT image generation API error: {}", e.getMessage());
            throw new RuntimeException("图像生成失败: " + e.getMessage());
        }
    }
}
