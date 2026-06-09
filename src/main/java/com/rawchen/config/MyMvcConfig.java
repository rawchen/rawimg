package com.rawchen.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.nio.file.Path;
import java.nio.file.Paths;


/**
 * 跨域和静态资源配置
 *
 * @author RawChen
 * @date 2023-12-05 10:33
 */
@Configuration
public class MyMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.path:./uploads}")
    private String configUploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 获取绝对路径
        Path path = Paths.get(configUploadPath);
        Path uploadDir;
        if (!path.isAbsolute()) {
            String userDir = System.getProperty("user.dir");
            uploadDir = Paths.get(userDir, configUploadPath).toAbsolutePath().normalize();
        } else {
            uploadDir = path.toAbsolutePath().normalize();
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + "/");

        // SPA 路由支持：对于非静态资源的请求，返回 index.html
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) {
                        try {
                            Resource requestedResource = location.createRelative(resourcePath);

                            // 如果资源存在且可读，则直接返回
                            if (requestedResource.exists() && requestedResource.isReadable()) {
                                return requestedResource;
                            }

                            // 如果是 API 请求，返回 null（让后续处理器处理）
                            if (resourcePath.startsWith("api/") || resourcePath.startsWith("ws/")) {
                                return null;
                            }

                            // 其他请求返回 index.html（SPA 路由）
                            return new ClassPathResource("/static/index.html");
                        } catch (Exception e) {
                            return null;
                        }
                    }
                });
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 添加根路径的视图控制器
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}