package com.rawchen.service.impl;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifThumbnailDirectory;
import com.rawchen.dto.RawImagePreviewResponse;
import com.rawchen.service.RawImageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class RawImageServiceImpl implements RawImageService {

    @Value("${app.upload.path:./uploads}")
    private String configUploadPath;

    private Path uploadPath;

    private static final Set<String> RAW_EXTENSIONS = new HashSet<>(Arrays.asList(
            "cr2", "nef", "arw", "dng", "orf", "rw2", "raf", "pef", "srw", "x3f", "raw"
    ));

    private static final long MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB for RAW files

    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    @PostConstruct
    public void init() {
        Path path = Paths.get(configUploadPath);
        if (!path.isAbsolute()) {
            String userDir = System.getProperty("user.dir");
            uploadPath = Paths.get(userDir, configUploadPath);
        } else {
            uploadPath = path;
        }
        try {
            Files.createDirectories(uploadPath.resolve("raw-previews"));
        } catch (IOException e) {
            throw new RuntimeException("Cannot create upload directory: " + uploadPath, e);
        }
    }

    @Override
    public RawImagePreviewResponse processRawImage(MultipartFile file) {
        // Validate file
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds limit (200MB)");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = getFileExtension(originalFilename).toLowerCase();

        if (!RAW_EXTENSIONS.contains(ext)) {
            throw new RuntimeException("Not a RAW image format: " + ext);
        }

        try {
            byte[] fileBytes = file.getBytes();

            // Extract embedded JPEG preview by scanning for JPEG markers
            byte[] previewData = extractEmbeddedJpeg(fileBytes);

            if (previewData == null || previewData.length == 0) {
                throw new RuntimeException("No embedded preview found in RAW file");
            }

            // Generate unique filename for preview
            String previewFilename = UUID.randomUUID().toString() + ".jpg";
            String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            String relativePath = "raw-previews/" + datePath + "/" + previewFilename;

            // Save preview image
            Path targetPath = uploadPath.resolve(relativePath);
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, previewData);

            // Extract metadata
            int width = 0, height = 0;
            Map<String, Object> exif = new LinkedHashMap<>();

            try {
                Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(fileBytes));
                exif = extractExifMetadata(metadata);

                // Try to get dimensions from EXIF
                ExifIFD0Directory ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
                if (ifd0 != null) {
                    width = ifd0.getInteger(ExifIFD0Directory.TAG_IMAGE_WIDTH);
                    height = ifd0.getInteger(ExifIFD0Directory.TAG_IMAGE_HEIGHT);
                }
            } catch (Exception e) {
                log.debug("Could not read metadata: {}", e.getMessage());
            }

            return RawImagePreviewResponse.builder()
                    .previewUrl("/uploads/" + relativePath)
                    .filename(originalFilename)
                    .width(width)
                    .height(height)
                    .isRaw(true)
                    .exif(exif)
                    .build();

        } catch (IOException e) {
            log.error("Failed to process RAW image: {}", originalFilename, e);
            throw new RuntimeException("Failed to process RAW image: " + e.getMessage());
        }
    }

    /**
     * Extract embedded JPEG from RAW file by finding JPEG signature markers
     */
    private byte[] extractEmbeddedJpeg(byte[] data) {
        // Find JPEG start marker (FFD8FF)
        int start = -1;
        for (int i = 0; i < data.length - 4; i++) {
            if (data[i] == (byte) 0xFF && data[i + 1] == (byte) 0xD8 && data[i + 2] == (byte) 0xFF) {
                // Found JPEG signature, look for the largest preview (usually the first significant one)
                if (start == -1) {
                    start = i;
                }
            }
        }

        if (start == -1) {
            log.warn("No JPEG signature found in file");
            return null;
        }

        // Find JPEG end marker (FFD9)
        int end = -1;
        for (int i = start; i < data.length - 1; i++) {
            if (data[i] == (byte) 0xFF && data[i + 1] == (byte) 0xD9) {
                end = i + 2;
                break;
            }
        }

        if (end == -1) {
            log.warn("No JPEG end marker found");
            return null;
        }

        int length = end - start;
        log.info("Extracted embedded JPEG: {} bytes starting at offset {}", length, start);

        byte[] jpegData = new byte[length];
        System.arraycopy(data, start, jpegData, 0, length);
        return jpegData;
    }

    /**
     * Extract useful EXIF metadata
     */
    private Map<String, Object> extractExifMetadata(Metadata metadata) {
        Map<String, Object> exif = new LinkedHashMap<>();

        // Camera info from IFD0
        ExifIFD0Directory ifd0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
        if (ifd0 != null) {
            addIfExists(exif, "make", ifd0, ExifIFD0Directory.TAG_MAKE);
            addIfExists(exif, "model", ifd0, ExifIFD0Directory.TAG_MODEL);
            addIfExists(exif, "orientation", ifd0, ExifIFD0Directory.TAG_ORIENTATION);
        }

        return exif;
    }

    private void addIfExists(Map<String, Object> map, String key, com.drew.metadata.Directory dir, int tag) {
        try {
            if (dir.containsTag(tag)) {
                Object value = dir.getObject(tag);
                if (value != null) {
                    // Only add simple types that can be serialized to JSON
                    if (value instanceof String || value instanceof Number || value instanceof Boolean) {
                        map.put(key, value);
                    } else {
                        // Convert complex objects to string description
                        String desc = dir.getDescription(tag);
                        if (desc != null) {
                            map.put(key, desc);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not read tag {} from directory", tag);
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }
}
