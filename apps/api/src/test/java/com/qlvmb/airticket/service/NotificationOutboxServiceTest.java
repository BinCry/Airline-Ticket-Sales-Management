package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.MyNotificationResponse;
import com.qlvmb.airticket.domain.dto.NotificationOutboxResponse;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import com.qlvmb.airticket.repository.NotificationOutboxRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class NotificationOutboxServiceTest {

  @Mock
  private NotificationOutboxRepository notificationOutboxRepository;

  @Mock
  private JavaMailSender mailSender;

  private NotificationOutboxService notificationOutboxService;

  @BeforeEach
  void setUp() {
    notificationOutboxService = new NotificationOutboxService(
        notificationOutboxRepository,
        mailSender,
        false,
        "support@airplane.id.vn"
    );
  }

  @Test
  void createAndSendTicketEmail_shouldMarkFailedWhenMailDisabled() {
    ArgumentCaptor<NotificationOutboxEntity> outboxCaptor = ArgumentCaptor.forClass(NotificationOutboxEntity.class);
    when(notificationOutboxRepository.save(any(NotificationOutboxEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    NotificationOutboxResponse response = notificationOutboxService.createAndSendTicketEmail(
        createBooking("QC5004", "quanpm2006git@gmail.com")
    );

    verify(notificationOutboxRepository).save(outboxCaptor.capture());
    assertThat(response.status()).isEqualTo(NotificationOutboxEntity.STATUS_FAILED);
    assertThat(response.lastError()).isEqualTo("Chưa bật cấu hình gửi email.");
    assertThat(outboxCaptor.getValue().getStatus()).isEqualTo(NotificationOutboxEntity.STATUS_FAILED);
  }

  @Test
  void createAndSendTicketEmail_shouldUseProductSubjectAndBody() {
    ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    notificationOutboxService = new NotificationOutboxService(
        notificationOutboxRepository,
        mailSender,
        true,
        "support@airplane.id.vn"
    );
    when(notificationOutboxRepository.save(any(NotificationOutboxEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    NotificationOutboxResponse response = notificationOutboxService.createAndSendTicketEmail(
        createBooking("QC5004", "quanpm2006git@gmail.com")
    );

    verify(mailSender).send(messageCaptor.capture());
    assertThat(response.status()).isEqualTo(NotificationOutboxEntity.STATUS_SENT);
    assertThat(messageCaptor.getValue().getSubject())
        .isEqualTo("Vé điện tử cho mã đặt chỗ QC5004 | Vietnam Airlines");
    assertThat(messageCaptor.getValue().getText())
        .contains("Chúng tôi xác nhận mã đặt chỗ QC5004 đã thanh toán thành công")
        .contains("Vui lòng lưu lại email này để xuất trình khi cần tra cứu")
        .contains("Trân trọng,")
        .contains("Vietnam Airlines");
  }

  @Test
  void createAndSendFlightCancellationEmail_shouldUseProductSubjectAndBody() {
    ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    notificationOutboxService = new NotificationOutboxService(
        notificationOutboxRepository,
        mailSender,
        true,
        "support@airplane.id.vn"
    );
    when(notificationOutboxRepository.save(any(NotificationOutboxEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    NotificationOutboxResponse response = notificationOutboxService.createAndSendFlightCancellationEmail(
        createBooking("QC5004", "quanpm2006git@gmail.com"),
        createFlight("VN123", "Hà Nội", "TP Hồ Chí Minh"),
        "Chuyến bay được điều chỉnh do yêu cầu vận hành."
    );

    verify(mailSender).send(messageCaptor.capture());
    assertThat(response.status()).isEqualTo(NotificationOutboxEntity.STATUS_SENT);
    assertThat(messageCaptor.getValue().getSubject())
        .isEqualTo("Cập nhật hành trình cho mã đặt chỗ QC5004 | Vietnam Airlines");
    assertThat(messageCaptor.getValue().getText())
        .contains("Chúng tôi rất tiếc phải thông báo chuyến bay VN123")
        .contains("Chuyến bay được điều chỉnh do yêu cầu vận hành.")
        .contains("Trân trọng,")
        .contains("Vietnam Airlines");
  }

  @Test
  void createAndSendRefundStatusEmail_shouldUseRefundOutcomeContent() {
    ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    notificationOutboxService = new NotificationOutboxService(
        notificationOutboxRepository,
        mailSender,
        true,
        "support@airplane.id.vn"
    );
    when(notificationOutboxRepository.save(any(NotificationOutboxEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    BookingEntity booking = createBooking("QC5004", "quanpm2006git@gmail.com");
    var refundRequest = com.qlvmb.airticket.domain.entity.RefundRequestEntity.createPending(
        booking,
        "Khong con nhu cau",
        1490000L,
        OffsetDateTime.parse("2026-05-17T14:30:00Z")
    );
    refundRequest.markApproved(OffsetDateTime.parse("2026-05-17T15:00:00Z"));

    NotificationOutboxResponse response = notificationOutboxService.createAndSendRefundStatusEmail(
        booking,
        refundRequest
    );

    verify(mailSender).send(messageCaptor.capture());
    assertThat(response.status()).isEqualTo(NotificationOutboxEntity.STATUS_SENT);
    assertThat(messageCaptor.getValue().getSubject())
        .contains("QC5004")
        .contains("Vietnam Airlines");
    assertThat(messageCaptor.getValue().getText())
        .contains("QC5004")
        .contains("Khong con nhu cau")
        .contains("Vietnam Airlines");
  }

  @Test
  void retryNotification_shouldSanitizeMailDeliveryFailure() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T14:30:00Z");
    NotificationOutboxEntity outbox = NotificationOutboxEntity.createTicketEmail(
        "QC5004",
        "quanpm2006git@gmail.com",
        "Vé điện tử cho mã đặt chỗ QC5004 | Vietnam Airlines",
        "Nội dung",
        currentTime
    );
    ReflectionTestUtils.setField(outbox, "id", 9L);

    notificationOutboxService = new NotificationOutboxService(
        notificationOutboxRepository,
        mailSender,
        true,
        "support@airplane.id.vn"
    );

    when(notificationOutboxRepository.findById(9L)).thenReturn(Optional.of(outbox));
    doThrow(new MailSendException("smtp timeout"))
        .when(mailSender)
        .send(any(SimpleMailMessage.class));

    NotificationOutboxResponse response = notificationOutboxService.retryNotification(9L);

    assertThat(response.status()).isEqualTo(NotificationOutboxEntity.STATUS_FAILED);
    assertThat(response.lastError()).isEqualTo("Không thể gửi email tới hộp thư người nhận lúc này.");
    assertThat(response.retryCount()).isEqualTo(1);
  }

  @Test
  void createAndSendTicketEmail_shouldDelaySendUntilAfterCommitWhenTransactionActive() {
    NotificationOutboxEntity persistedOutbox = NotificationOutboxEntity.createTicketEmail(
        "QC5005",
        "quanpm2006git@gmail.com",
        "VÃ© Ä‘iá»‡n tá»­ cho mÃ£ Ä‘áº·t chá»— QC5005 | Vietnam Airlines",
        "Ná»™i dung",
        OffsetDateTime.parse("2026-05-17T14:30:00Z")
    );
    ReflectionTestUtils.setField(persistedOutbox, "id", 11L);

    notificationOutboxService = new NotificationOutboxService(
        notificationOutboxRepository,
        mailSender,
        true,
        "support@airplane.id.vn"
    );

    when(notificationOutboxRepository.save(any(NotificationOutboxEntity.class)))
        .thenAnswer(invocation -> {
          NotificationOutboxEntity outbox = invocation.getArgument(0);
          ReflectionTestUtils.setField(outbox, "id", 11L);
          return outbox;
        });
    when(notificationOutboxRepository.findById(11L)).thenReturn(Optional.of(persistedOutbox));

    TransactionSynchronizationManager.initSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(true);
    try {
      NotificationOutboxResponse response = notificationOutboxService.createAndSendTicketEmail(
          createBooking("QC5005", "quanpm2006git@gmail.com")
      );

      assertThat(response.status()).isEqualTo(NotificationOutboxEntity.STATUS_PENDING);
      verify(mailSender, org.mockito.Mockito.never()).send(any(SimpleMailMessage.class));

      for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
        synchronization.afterCommit();
      }

      verify(mailSender).send(any(SimpleMailMessage.class));
      assertThat(persistedOutbox.getStatus()).isEqualTo(NotificationOutboxEntity.STATUS_SENT);
    } finally {
      TransactionSynchronizationManager.clearSynchronization();
      TransactionSynchronizationManager.setActualTransactionActive(false);
    }
  }

  @Test
  void getMyNotifications_shouldReturnNotificationsByAuthenticatedEmail() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T14:30:00Z");
    NotificationOutboxEntity outbox = NotificationOutboxEntity.createTicketEmail(
        "QC5004",
        "khach@example.com",
        "Thông báo vé điện tử",
        "Nội dung thông báo",
        currentTime
    );
    ReflectionTestUtils.setField(outbox, "id", 7L);
    outbox.markSent(currentTime.plusMinutes(1));

    when(notificationOutboxRepository.findTop5ByRecipientEmailIgnoreCaseOrderByCreatedAtDesc("khach@example.com"))
        .thenReturn(List.of(outbox));

    var authenticatedUser = new AuthenticatedUser(
        101L,
        "khach@example.com",
        "Khách Hàng",
        List.of("customer"),
        List.of("customer.self_service")
    );

    List<MyNotificationResponse> responses = notificationOutboxService.getMyNotifications(authenticatedUser);

    assertThat(responses).hasSize(1);
    assertThat(responses.get(0).id()).isEqualTo(7L);
    assertThat(responses.get(0).bookingCode()).isEqualTo("QC5004");
    assertThat(responses.get(0).subject()).isEqualTo("Thông báo vé điện tử");
    assertThat(responses.get(0).body()).isEqualTo("Nội dung thông báo");
  }

  private BookingEntity createBooking(String bookingCode, String email) {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T14:00:00Z");
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        1490000L,
        0L,
        1490000L,
        "VND",
        currentTime,
        currentTime.plusMinutes(15)
    );
    booking.assignContact(BookingContactEntity.create(
        booking,
        "Khách hàng thử nghiệm",
        email,
        "0900000001"
    ));
    return booking;
  }

  private FlightEntity createFlight(String code, String originCityName, String destinationCityName) {
    FlightEntity flight = mock(FlightEntity.class);
    AirportEntity originAirport = mock(AirportEntity.class);
    AirportEntity destinationAirport = mock(AirportEntity.class);

    when(flight.getCode()).thenReturn(code);
    when(flight.getOriginAirport()).thenReturn(originAirport);
    when(flight.getDestinationAirport()).thenReturn(destinationAirport);
    when(flight.getDepartureAt()).thenReturn(OffsetDateTime.parse("2026-06-01T08:30:00Z"));
    when(originAirport.getCityName()).thenReturn(originCityName);
    when(destinationAirport.getCityName()).thenReturn(destinationCityName);

    return flight;
  }
}
