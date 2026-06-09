package com.rawchen.dto;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Data
public class PageResponse<T> {
    private List<T> content;
    private long totalPages;
    private long totalElements;
    private long currentPage;

    public static <T> PageResponse<T> of(IPage<T> page, int currentPage) {
        PageResponse<T> response = new PageResponse<>();
        response.setContent(page.getRecords());
        response.setTotalPages(page.getPages());
        response.setTotalElements(page.getTotal());
        // currentPage: 当前页码（从1开始）
        response.setCurrentPage(page.getCurrent());
        return response;
    }

    public static <T, R> PageResponse<R> of(IPage<T> page, int currentPage, Function<T, R> converter) {
        PageResponse<R> response = new PageResponse<>();
        response.setContent(page.getRecords().stream().map(converter).collect(Collectors.toList()));
        response.setTotalPages(page.getPages());
        response.setTotalElements(page.getTotal());
        // currentPage: 当前页码（从1开始）
        response.setCurrentPage(page.getCurrent());
        return response;
    }
}
