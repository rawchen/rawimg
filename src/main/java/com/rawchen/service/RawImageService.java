package com.rawchen.service;

import com.rawchen.dto.RawImagePreviewResponse;
import org.springframework.web.multipart.MultipartFile;

public interface RawImageService {

    /**
     * Process RAW image file and extract embedded preview
     * @param file RAW image file
     * @return Preview image info with metadata
     */
    RawImagePreviewResponse processRawImage(MultipartFile file);
}
