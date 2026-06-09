package com.rawchen;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.rawchen.mapper")
public class RawimgApplication {
    public static void main(String[] args) {
        SpringApplication.run(RawimgApplication.class, args);
    }
}
