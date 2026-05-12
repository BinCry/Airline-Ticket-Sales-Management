package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.PaymentCallbackRequest;
import com.qlvmb.airticket.domain.dto.PaymentSessionResponse;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

  @Mock
  private BookingService bookingService;

  private PaymentService paymentService;

  @BeforeEach
  void setUp() {
    paymentService = new PaymentService(bookingService);
  }

  @Test
  void createPaymentSession_shouldReturnSandboxUrl() {
    BookingEntity booking = heldBooking("A6C2P1");
    when(bookingService.findBookingForPayment("A6C2P1")).thenReturn(booking);
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PENDING)).thenReturn("pending");

    PaymentSessionResponse response = paymentService.createPaymentSession("A6C2P1");

    assertThat(response.bookingCode()).isEqualTo("A6C2P1");
    assertThat(response.paymentUrl()).isEqualTo("/payment-sandbox?pnr=A6C2P1");
    assertThat(response.paymentStatus()).isEqualTo("pending");
  }

  @Test
  void handlePaymentCallback_shouldTicketBookingAndCreateTicket() {
    BookingEntity booking = heldBooking("A6C2P1");
    when(bookingService.findBookingForPayment("A6C2P1")).thenReturn(booking);
    when(bookingService.generatePaymentReference()).thenReturn("SANDBOX-000000000001");
    when(bookingService.generateUniqueTicketNumber()).thenReturn("7380000000001");
    when(bookingService.mapOverviewResponse(booking)).thenCallRealMethod();
    when(bookingService.mapBookingStatus(BookingEntity.STATUS_TICKETED)).thenReturn("ticketed");
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PAID)).thenReturn("paid");
    when(bookingService.mapTicketStatus("ISSUED")).thenReturn("issued");

    var response = paymentService.handlePaymentCallback(new PaymentCallbackRequest("A6C2P1", "success"));

    assertThat(response.status()).isEqualTo("ticketed");
    assertThat(response.paymentStatus()).isEqualTo("paid");
    assertThat(response.tickets()).hasSize(1);
  }

  @Test
  void handlePaymentCallback_shouldPropagateExpiredHold() {
    when(bookingService.findBookingForPayment("A6C2P1"))
        .thenThrow(new NotFoundException("Mã đặt chỗ không hợp lệ hoặc đã hết hạn giữ chỗ."));

    assertThatThrownBy(() ->
        paymentService.handlePaymentCallback(new PaymentCallbackRequest("A6C2P1", "success"))
    )
        .isInstanceOf(NotFoundException.class)
        .hasMessage("Mã đặt chỗ không hợp lệ hoặc đã hết hạn giữ chỗ.");
  }

  private BookingEntity heldBooking(String bookingCode) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(2);
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        1490000L,
        0L,
        1490000L,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );

    booking.assignContact(BookingContactEntity.create(
        booking,
        "Nguyen Van A",
        "a@example.com",
        "0912345678"
    ));

    booking.addPassenger(BookingPassengerEntity.create(
        booking,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1995, 5, 12),
        "CCCD",
        "079123456789",
        createdAt
    ));

    return booking;
  }
}
