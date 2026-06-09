package com.rawchen.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChartItemResponse {
    private String title;
    private long count;
}
