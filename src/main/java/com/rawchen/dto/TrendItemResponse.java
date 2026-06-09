package com.rawchen.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TrendItemResponse {
    private String date;
    private long views;
    private long uv;
    private long downloads;
    private long likes;
    private long favorites;
}
