package com.rawchen.dto;

import lombok.Data;

@Data
public class RegisterRequest {

    private String username;

    private String email;

    private String password;

    private String captchaAnswer;
    private String captchaSessionId;

    private String emailCode;
}
