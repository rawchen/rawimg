package com.rawchen.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 文件上传服务接口
 */
public interface UploadService {

    /**
     * 上传单个图片
     */
    String uploadImage(MultipartFile file);

    /**
     * 批量上传图片
     */
    List<String> uploadImages(MultipartFile[] files);
}
