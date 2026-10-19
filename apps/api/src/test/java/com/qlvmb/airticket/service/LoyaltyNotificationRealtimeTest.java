package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import com.qlvmb.airticket.repository.NotificationOutboxRepository;
import java.util.concurrent.Executor;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class LoyaltyNotificationRealtimeTest {
  @Test
  void flightChangePersistsOnceAndPublishesAfterCommit() {
    NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
    RealtimeFlightStreamService stream = mock(RealtimeFlightStreamService.class);
    BookingEntity booking = mock(BookingEntity.class);
    BookingContactEntity contact = mock(BookingContactEntity.class);
    FlightEntity flight = mock(FlightEntity.class);
    when(booking.getBookingCode()).thenReturn("AB1234");
    when(booking.getContact()).thenReturn(contact);
    when(contact.getEmail()).thenReturn("member@example.test");
    when(flight.getCode()).thenReturn("VN123");
    when(repository.existsByDedupKey("event:1:AB1234")).thenReturn(false);
    when(repository.save(any(NotificationOutboxEntity.class))).thenAnswer(invocation -> {
      NotificationOutboxEntity entry = invocation.getArgument(0);
      ReflectionTestUtils.setField(entry, "id", 51L);
      return entry;
    });
    NotificationOutboxService service = new NotificationOutboxService(
        repository, stream, command -> { }, null, false, "", mock(PlatformTransactionManager.class));

    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);
    try {
      service.createFlightUpdate(booking, flight, "event:1:AB1234", "Flight changed", "New time");

      ArgumentCaptor<NotificationOutboxEntity> saved = ArgumentCaptor.forClass(NotificationOutboxEntity.class);
      verify(repository).save(saved.capture());
      assertThat(saved.getValue().getType()).isEqualTo("FLIGHT_UPDATE");
      assertThat(saved.getValue().getFlightCode()).isEqualTo("VN123");
      verifyNoInteractions(stream);

      for (var synchronization : TransactionSynchronizationManager.getSynchronizations()) {
        synchronization.afterCommit();
      }
      verify(stream).pushPrivate("member@example.test", 51L);
    } finally {
      TransactionSynchronizationManager.clearSynchronization();
      TransactionSynchronizationManager.setActualTransactionActive(false);
    }
  }

  @Test
  void duplicateFlightChangeIsNotPersistedOrPublished() {
    NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
    RealtimeFlightStreamService stream = mock(RealtimeFlightStreamService.class);
    BookingEntity booking = mock(BookingEntity.class);
    FlightEntity flight = mock(FlightEntity.class);
    when(repository.existsByDedupKey("event:1:AB1234")).thenReturn(true);
    NotificationOutboxService service = new NotificationOutboxService(
        repository, stream, command -> { }, null, false, "", mock(PlatformTransactionManager.class));

    service.createFlightUpdate(booking, flight, "event:1:AB1234", "Flight changed", "New time");

    verify(repository).existsByDedupKey("event:1:AB1234");
    verify(repository, never()).save(any());
    verifyNoInteractions(stream);
  }

  @Test
  void rolledBackFlightChangeDoesNotPublishToRealtimeStream() {
    NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
    RealtimeFlightStreamService stream = mock(RealtimeFlightStreamService.class);
    BookingEntity booking = mock(BookingEntity.class);
    BookingContactEntity contact = mock(BookingContactEntity.class);
    FlightEntity flight = mock(FlightEntity.class);
    when(booking.getBookingCode()).thenReturn("AB1234");
    when(booking.getContact()).thenReturn(contact);
    when(contact.getEmail()).thenReturn("member@example.test");
    when(flight.getCode()).thenReturn("VN123");
    when(repository.save(any(NotificationOutboxEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
    NotificationOutboxService service = new NotificationOutboxService(
        repository, stream, command -> { }, null, false, "", mock(PlatformTransactionManager.class));

    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);
    try {
      service.createFlightUpdate(booking, flight, "event:2:AB1234", "Flight changed", "New time");
      for (var synchronization : TransactionSynchronizationManager.getSynchronizations()) {
        synchronization.afterCompletion(org.springframework.transaction.support.TransactionSynchronization.STATUS_ROLLED_BACK);
      }
      verify(repository).save(any(NotificationOutboxEntity.class));
      verifyNoInteractions(stream);
    } finally {
      TransactionSynchronizationManager.clearSynchronization();
      TransactionSynchronizationManager.setActualTransactionActive(false);
    }
  }

  @Test
  void tierUpgradeSendsPrivateNotificationOnlyAfterCommit() {
    NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
    RealtimeFlightStreamService stream = mock(RealtimeFlightStreamService.class);
    Executor noOpDelivery = command -> { /* No email is sent from this unit test. */ };

    when(repository.save(any(NotificationOutboxEntity.class))).thenAnswer(invocation -> {
      NotificationOutboxEntity entry = invocation.getArgument(0);
      ReflectionTestUtils.setField(entry, "id", 42L);
      return entry;
    });

    NotificationOutboxService service = new NotificationOutboxService(
        repository, stream, noOpDelivery, null, false, "",
        mock(PlatformTransactionManager.class));

    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);
    try {
      service.createAndSendLoyaltyTierUpgradeEmail(
          "member@example.com", "PNR123", "Hội viên Bạc → Hội viên Vàng");

      verifyNoInteractions(stream);

      for (var synchronization : TransactionSynchronizationManager.getSynchronizations()) {
        synchronization.afterCommit();
      }
      verify(stream).pushPrivate("member@example.com", 42L);
    } finally {
      TransactionSynchronizationManager.clearSynchronization();
      TransactionSynchronizationManager.setActualTransactionActive(false);
    }
  }
}
