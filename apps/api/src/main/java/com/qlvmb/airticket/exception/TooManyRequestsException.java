package com.qlvmb.airticket.exception;

import org.springframework.http.HttpStatus;

// Lỗi 429 khi người dùng gửi quá nhiều yêu cầu trong một khoảng thời gian.
public class TooManyRequestsException extends ApiException {

  public TooManyRequestsException(String message) {
    super(HttpStatus.TOO_MANY_REQUESTS, message);
  }
}
