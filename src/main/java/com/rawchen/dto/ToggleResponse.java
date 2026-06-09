package com.rawchen.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ToggleResponse {
    private boolean liked;
    private boolean favorited;

    public static ToggleResponse liked(boolean liked) {
        return new ToggleResponse(liked, false);
    }

    public static ToggleResponse favorited(boolean favorited) {
        return new ToggleResponse(false, favorited);
    }
}
