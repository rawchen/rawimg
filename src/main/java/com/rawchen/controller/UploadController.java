package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.entity.SysUser;
import com.rawchen.service.OssUploadService;
import com.rawchen.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;
    private final OssUploadService ossUploadService;

    @PostMapping("/upload")
    public R<String> uploadImage(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal SysUser user) {

        if (user == null) {
            return R.unauthorized();
        }
        String url = uploadService.uploadImage(file);
        return R.ok(url);
    }

    /**
     * 上传图片到OSS（用于图像扩展等需要URL的场景）
     */
    @PostMapping("/upload/oss")
    public R<String> uploadImageToOss(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "expand-temp/") String folder,
            @AuthenticationPrincipal SysUser user) {

        if (user == null) {
            return R.unauthorized();
        }
        String url = ossUploadService.uploadFile(file, folder);
        return R.ok(url);
    }

    @PostMapping("/admin/upload")
    public R<String> adminUploadImage(@RequestParam("file") MultipartFile file) {
        String url = uploadService.uploadImage(file);
        return R.ok(url);
    }

    @PostMapping("/admin/upload/batch")
    public R<List<String>> uploadImages(@RequestParam("files") MultipartFile[] files) {
        List<String> urls = uploadService.uploadImages(files);
        return R.ok(urls);
    }
}
