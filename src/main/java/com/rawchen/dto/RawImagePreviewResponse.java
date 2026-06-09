package com.rawchen.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RawImagePreviewResponse {

    private String previewUrl;

    private String filename;

    private int width;

    private int height;

    private boolean isRaw;

    private Map<String, Object> exif;
}
