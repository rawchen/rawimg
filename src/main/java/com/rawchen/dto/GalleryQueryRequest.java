package com.rawchen.dto;

import lombok.Data;

@Data
public class GalleryQueryRequest {
    private Integer page = 1;
    
    private Integer size = 20;
    
    private String sortBy = "latest";
}
