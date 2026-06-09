package com.rawchen.dto;

import com.rawchen.entity.Gallery;
import com.rawchen.entity.GalleryImage;
import lombok.Data;
import org.springframework.beans.BeanUtils;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class GalleryEditResponse {
    private Long id;
    private String title;
    private String description;
    private String coverUrl;
    private String content;
    private String downloadLink;
    private String status;
    private List<GalleryImageDto> images;

    public static GalleryEditResponse from(Gallery gallery, List<GalleryImageDto> images) {
        GalleryEditResponse response = new GalleryEditResponse();
        BeanUtils.copyProperties(gallery, response);
        response.setStatus(gallery.getStatus().name());
        response.setImages(images);
        return response;
    }

    public static GalleryEditResponse fromWithImages(Gallery gallery, List<GalleryImage> images) {
        GalleryEditResponse response = new GalleryEditResponse();
        BeanUtils.copyProperties(gallery, response);
        response.setStatus(gallery.getStatus().name());
        List<GalleryImageDto> imageDtos = images.stream()
                .map(GalleryImageDto::fromExisting)
                .collect(Collectors.toList());
        response.setImages(imageDtos);
        return response;
    }
}
