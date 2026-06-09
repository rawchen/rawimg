package com.rawchen.controller;

import com.rawchen.dto.RawImagePreviewResponse;
import com.rawchen.entity.R;
import com.rawchen.service.RawImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/raw")
@RequiredArgsConstructor
public class RawImageController {

    private final RawImageService rawImageService;

    /**
     * Process RAW image file and extract embedded preview
     * Supports: CR2, NEF, ARW, DNG, ORF, RW2, RAF, PEF, SRW, X3F, RAW
     */
    @PostMapping("/preview")
    public R<RawImagePreviewResponse> extractPreview(@RequestParam("file") MultipartFile file) {
        log.info("Processing RAW file: {} ({})", file.getOriginalFilename(), file.getSize());
        try {
            RawImagePreviewResponse response = rawImageService.processRawImage(file);
            return R.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to process RAW file: {}", e.getMessage());
            return R.fail(e.getMessage());
        }
    }
}