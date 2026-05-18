package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FinanceServiceTest {

  @Mock
  private RefundRequestRepository refundRequestRepository;

  private FinanceService financeService;

  @BeforeEach
  void setUp() {
    financeService = new FinanceService(refundRequestRepository);
  }

  @Test
  void approveRefund_shouldApproveRefundCancelBookingTicketsAndReleaseSeats() {
    Fixture fixture = pendingRefundFixture();
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.of(fixture.refundRequest));

    var response = financeService.approveRefund(55L);

    assertThat(response.status()).isEqualTo("approved");
    assertThat(response.bookingStatus()).isEqualTo("cancelled");
    assertThat(fixture.refundRequest.getStatus()).isEqualTo(RefundRequestEntity.STATUS_APPROVED);
    assertThat(fixture.booking.getStatus()).isEqualTo(BookingEntity.STATUS_CANCELLED);
    assertThat(fixture.ticket.getStatus()).isEqualTo(TicketEntity.STATUS_CANCELLED);
    verify(fixture.inventory).releaseSeats(1);
  }

  @Test
  void rejectRefund_shouldRejectRefundAndRestoreBookingToTicketed() {
    Fixture fixture = pendingRefundFixture();
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.of(fixture.refundRequest));

    var response = financeService.rejectRefund(55L);

    assertThat(response.status()).isEqualTo("rejected");
    assertThat(response.bookingStatus()).isEqualTo("ticketed");
    assertThat(fixture.refundRequest.getStatus()).isEqualTo(RefundRequestEntity.STATUS_REJECTED);
    assertThat(fixture.booking.getStatus()).isEqualTo(BookingEntity.STATUS_TICKETED);
    assertThat(fixture.ticket.getStatus()).isEqualTo(TicketEntity.STATUS_ISSUED);
  }

  @Test
  void approveRefund_shouldRejectWhenRefundNoLongerPending() {
    Fixture fixture = pendingRefundFixture();
    fixture.refundRequest.markApproved(OffsetDateTime.now());
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.of(fixture.refundRequest));

    assertThatThrownBy(() -> financeService.approveRefund(55L))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Yêu cầu hoàn vé này không còn ở trạng thái chờ duyệt.");
  }

  @Test
  void rejectRefund_shouldRejectWhenRefundNoLongerPending() {
    Fixture fixture = pendingRefundFixture();
    fixture.booking.markTicketedAgain(OffsetDateTime.now());
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.of(fixture.refundRequest));

    assertThatThrownBy(() -> financeService.rejectRefund(55L))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Yêu cầu hoàn vé này không còn ở trạng thái có thể từ chối.");
  }

  @Test
  void approveRefund_shouldThrowNotFoundWhenRefundMissing() {
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> financeService.approveRefund(55L))
        .isInstanceOf(NotFoundException.class)
        .hasMessage("Không tìm thấy yêu cầu hoàn vé tương ứng.");
  }

  @Test
  void getRefunds_shouldReturnNewestFirst() {
    Fixture newer = pendingRefundFixture("B7D4Q2", 66L, OffsetDateTime.parse("2026-05-11T10:00:00+07:00"));
    Fixture older = pendingRefundFixture("A6C2P1", 55L, OffsetDateTime.parse("2026-05-10T10:00:00+07:00"));
    when(refundRequestRepository.findAllDetailedOrderByCreatedAtDesc())
        .thenReturn(List.of(newer.refundRequest, older.refundRequest));

    var response = financeService.getRefunds();

    assertThat(response).hasSize(2);
    assertThat(response.get(0).bookingCode()).isEqualTo("B7D4Q2");
    assertThat(response.get(1).bookingCode()).isEqualTo("A6C2P1");
  }

  @Test
  void hideResolvedRefund_shouldHideWhenRefundAlreadyProcessed() {
    Fixture fixture = pendingRefundFixture();
    fixture.refundRequest.markApproved(OffsetDateTime.now());
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.of(fixture.refundRequest));

    financeService.hideResolvedRefund(55L);

    assertThat(fixture.refundRequest.isHidden()).isTrue();
  }

  @Test
  void hideResolvedRefund_shouldRejectWhenPending() {
    Fixture fixture = pendingRefundFixture();
    when(refundRequestRepository.lockDetailedById(55L)).thenReturn(Optional.of(fixture.refundRequest));

    assertThatThrownBy(() -> financeService.hideResolvedRefund(55L))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Yêu cầu hoàn vé đang chờ duyệt, chưa thể xóa khỏi danh sách.");
  }

  private Fixture pendingRefundFixture() {
    return pendingRefundFixture("A6C2P1", 55L, OffsetDateTime.parse("2026-05-10T10:00:00+07:00"));
  }

  private Fixture pendingRefundFixture(String bookingCode, long refundRequestId, OffsetDateTime refundCreatedAt) {
    OffsetDateTime createdAt = refundCreatedAt.minusDays(1);
    FlightFareInventoryEntity inventory = mock(FlightFareInventoryEntity.class);

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

    BookingPassengerEntity passenger = BookingPassengerEntity.create(
        booking,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1995, 5, 12),
        "CCCD",
        "079123456789",
        createdAt
    );
    booking.addPassenger(passenger);
    booking.addSegment(BookingSegmentEntity.create(
        booking,
        inventory,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        OffsetDateTime.parse("2026-06-01T06:10:00+07:00"),
        OffsetDateTime.parse("2026-06-01T08:20:00+07:00"),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        1490000L,
        1,
        1490000L,
        createdAt
    ));
    booking.markTicketed("SANDBOX-000000000001", createdAt.plusMinutes(5));

    TicketEntity ticket = TicketEntity.issue(
        booking,
        passenger,
        "7380000000001",
        createdAt.plusMinutes(5)
    );
    booking.addTicket(ticket);
    RefundRequestEntity refundRequest = RefundRequestEntity.createPending(
        booking,
        "Thay doi ke hoach",
        booking.getTotalAmount(),
        refundCreatedAt
    );
    booking.addRefundRequest(refundRequest);
    booking.markRefundPending(refundCreatedAt);

    setRefundRequestId(refundRequest, refundRequestId);
    return new Fixture(booking, refundRequest, ticket, inventory);
  }

  private void setRefundRequestId(RefundRequestEntity refundRequest, long refundRequestId) {
    try {
      var field = RefundRequestEntity.class.getDeclaredField("id");
      field.setAccessible(true);
      field.set(refundRequest, refundRequestId);
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException("Không thể gán mã yêu cầu hoàn vé cho dữ liệu kiểm thử.", exception);
    }
  }

  private record Fixture(
      BookingEntity booking,
      RefundRequestEntity refundRequest,
      TicketEntity ticket,
      FlightFareInventoryEntity inventory
  ) {
  }
}
