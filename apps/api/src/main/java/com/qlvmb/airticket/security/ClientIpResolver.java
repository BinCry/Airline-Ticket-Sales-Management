package com.qlvmb.airticket.security;

import jakarta.servlet.http.HttpServletRequest;

// Lấy IP người gửi; tách từ AuthController để dùng chung cho giới hạn tần suất.
public final class ClientIpResolver {

  private ClientIpResolver() {
  }

  public static String resolve(HttpServletRequest servletRequest) {
    if (servletRequest == null) {
      return null;
    }
    String forwardedFor = servletRequest.getHeader("X-Forwarded-For");
    if (forwardedFor != null && !forwardedFor.isBlank()) {
      return forwardedFor.split(",")[0].trim();
    }
    return servletRequest.getRemoteAddr();
  }
}
