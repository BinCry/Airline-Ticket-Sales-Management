package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class LoyaltyEngineServiceTest {
  @Test
  void pointsUseTotalFareBeforeRoundingAndRejectOverflow() {
    assertThat(LoyaltyEngineService.calculatePoints(1_250_999, 2)).isEqualTo(2501);
    assertThat(LoyaltyEngineService.calculatePoints(999, 2)).isEqualTo(1);
    assertThat(LoyaltyEngineService.calculatePoints(1000, 0)).isZero();
    assertThatThrownBy(() -> LoyaltyEngineService.calculatePoints(-1, 1)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> LoyaltyEngineService.calculatePoints(Long.MAX_VALUE, 2)).isInstanceOf(ArithmeticException.class);
    assertThatThrownBy(() -> LoyaltyEngineService.calculatePoints((long) Integer.MAX_VALUE * 1000 + 1000, 1))
        .isInstanceOf(ArithmeticException.class);
  }
}
