package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class RealtimeFlightStreamServiceTest {
  @Test
  void subscribersCanReconnectAndCompletionCleansUpOnlyThatConnection() {
    RealtimeFlightStreamService service = new RealtimeFlightStreamService();

    SseEmitter first = service.privateStream("Member@example.test");
    SseEmitter reconnect = service.privateStream("member@example.test");

    @SuppressWarnings("unchecked")
    var members = (ConcurrentHashMap<String, Set<SseEmitter>>) ReflectionTestUtils.getField(service, "members");
    assertThat(members).containsKey("member@example.test");
    assertThat(members.get("member@example.test")).containsExactlyInAnyOrder(first, reconnect);

    Runnable completion = (Runnable) ReflectionTestUtils.getField(first, "completionCallback");
    completion.run();

    assertThat(members.get("member@example.test")).containsExactly(reconnect);
    Runnable reconnectCompletion = (Runnable) ReflectionTestUtils.getField(reconnect, "completionCallback");
    reconnectCompletion.run();
    assertThat(members).doesNotContainKey("member@example.test");
  }

  @Test
  void publicFlightStreamsNormalizeCodeAndCleanupEmptyRegistry() {
    RealtimeFlightStreamService service = new RealtimeFlightStreamService();

    SseEmitter emitter = service.publicStream("vn123");
    @SuppressWarnings("unchecked")
    var flights = (ConcurrentHashMap<String, Set<SseEmitter>>) ReflectionTestUtils.getField(service, "publicFlights");
    assertThat(flights.get("VN123")).containsExactly(emitter);

    Runnable completion = (Runnable) ReflectionTestUtils.getField(emitter, "completionCallback");
    completion.run();

    assertThat(flights).doesNotContainKey("VN123");
  }
}
