package com.qlvmb.airticket.security;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.qlvmb.airticket.exception.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RequestRateLimiterTest {

  private static final Duration WINDOW = Duration.ofMinutes(15);

  // Đồng hồ giả để dịch thời gian trong test.
  private static final class MutableClock extends Clock {
    private Instant now = Instant.parse("2026-11-16T00:00:00Z");

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return now;
    }

    void advance(Duration duration) {
      now = now.plus(duration);
    }
  }

  @Test
  void consume_shouldRejectAfterLimitWithinWindow() {
    RequestRateLimiter limiter = new RequestRateLimiter(new MutableClock());
    for (int i = 0; i < 3; i++) {
      limiter.consume("otp:a@example.com", 3, WINDOW, "quá nhiều");
    }
    assertThatThrownBy(() -> limiter.consume("otp:a@example.com", 3, WINDOW, "quá nhiều"))
        .isInstanceOf(TooManyRequestsException.class)
        .hasMessage("quá nhiều");
    assertThatCode(() -> limiter.consume("otp:b@example.com", 3, WINDOW, "quá nhiều")).doesNotThrowAnyException();
  }

  @Test
  void consume_shouldAllowAgainAfterWindowPasses() {
    MutableClock clock = new MutableClock();
    RequestRateLimiter limiter = new RequestRateLimiter(clock);
    for (int i = 0; i < 3; i++) {
      limiter.consume("hold-ip:1.2.3.4", 3, WINDOW, "quá nhiều");
    }
    clock.advance(WINDOW.plusSeconds(1));
    assertThatCode(() -> limiter.consume("hold-ip:1.2.3.4", 3, WINDOW, "quá nhiều")).doesNotThrowAnyException();
  }

  @Test
  void assertAllowed_shouldCountOnlyRecordedFailuresAndResetOnSuccess() {
    RequestRateLimiter limiter = new RequestRateLimiter(new MutableClock());
    for (int i = 0; i < 5; i++) {
      limiter.assertAllowed("login-email:a@example.com", 5, WINDOW, "khóa");
      limiter.record("login-email:a@example.com", WINDOW);
    }
    assertThatThrownBy(() -> limiter.assertAllowed("login-email:a@example.com", 5, WINDOW, "khóa"))
        .isInstanceOf(TooManyRequestsException.class);
    limiter.reset("login-email:a@example.com");
    assertThatCode(() -> limiter.assertAllowed("login-email:a@example.com", 5, WINDOW, "khóa"))
        .doesNotThrowAnyException();
  }
}
