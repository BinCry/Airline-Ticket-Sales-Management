package com.qlvmb.airticket.security;

import com.qlvmb.airticket.exception.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

// Bộ giới hạn tần suất trong bộ nhớ theo cửa sổ trượt, dùng cho đăng nhập, OTP và giữ chỗ.
// Mỗi khóa (ví dụ "login-email:a@b.com") lưu các mốc thời gian còn nằm trong cửa sổ.
@Component
public class RequestRateLimiter {

  private static final int MAX_TRACKED_KEYS = 50_000;

  private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
  private final Clock clock;

  @Autowired
  public RequestRateLimiter() {
    this(Clock.systemUTC());
  }

  RequestRateLimiter(Clock clock) {
    this.clock = clock;
  }

  // Ném 429 nếu khóa đã đạt ngưỡng trong cửa sổ; không ghi thêm lượt.
  public void assertAllowed(String key, int limit, Duration window, String message) {
    if (limit <= 0 || key == null) {
      return;
    }
    Deque<Instant> deque = hits.get(key);
    if (deque == null) {
      return;
    }
    synchronized (deque) {
      prune(deque, window);
      if (deque.size() >= limit) {
        throw new TooManyRequestsException(message);
      }
    }
  }

  // Ghi một lượt cho khóa.
  public void record(String key, Duration window) {
    if (key == null) {
      return;
    }
    if (hits.size() > MAX_TRACKED_KEYS) {
      cleanup(window);
    }
    Deque<Instant> deque = hits.computeIfAbsent(key, ignored -> new ArrayDeque<>());
    synchronized (deque) {
      prune(deque, window);
      deque.addLast(clock.instant());
    }
  }

  // Kiểm tra ngưỡng rồi ghi lượt trong cùng một bước (dùng cho yêu cầu gửi OTP, giữ chỗ).
  public void consume(String key, int limit, Duration window, String message) {
    if (limit <= 0 || key == null) {
      return;
    }
    Deque<Instant> deque = hits.computeIfAbsent(key, ignored -> new ArrayDeque<>());
    synchronized (deque) {
      prune(deque, window);
      if (deque.size() >= limit) {
        throw new TooManyRequestsException(message);
      }
      deque.addLast(clock.instant());
    }
  }

  // Xóa lịch sử của khóa, ví dụ sau khi đăng nhập thành công.
  public void reset(String key) {
    if (key != null) {
      hits.remove(key);
    }
  }

  private void prune(Deque<Instant> deque, Duration window) {
    Instant threshold = clock.instant().minus(window);
    while (!deque.isEmpty() && deque.peekFirst().isBefore(threshold)) {
      deque.pollFirst();
    }
  }

  private void cleanup(Duration window) {
    hits.entrySet().removeIf(entry -> {
      synchronized (entry.getValue()) {
        prune(entry.getValue(), window);
        return entry.getValue().isEmpty();
      }
    });
  }
}
