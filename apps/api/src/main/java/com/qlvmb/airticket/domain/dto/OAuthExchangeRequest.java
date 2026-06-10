package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthExchangeRequest(
    @NotBlank(message = "Mã đăng nhập OAuth không được để trống.") String code
) {
}
