package com.qlvmb.airticket.config;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {

  private final Path avatarRoot;

  public UploadResourceConfig(@Value("${app.upload.avatar-dir:uploads/avatars}") String avatarDir) {
    this.avatarRoot = Path.of(avatarDir).toAbsolutePath().normalize();
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/uploads/avatars/**")
        .addResourceLocations(avatarRoot.toUri().toString());
  }
}
