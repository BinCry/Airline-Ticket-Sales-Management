package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class VoucherLockServiceTest {
  private final MemberVoucherRepository vouchers = mock(MemberVoucherRepository.class);
  private final BookingRepository bookings = mock(BookingRepository.class);
  private final EntityManager em = mock(EntityManager.class);
  private final VoucherLockService service = new VoucherLockService(vouchers, bookings, em);
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-29T00:00:00Z");

  @Test
  void locksOldAndNewCodesInDeterministicOrderAndRefreshes() {
    MemberVoucherEntity voucher = voucher();
    when(vouchers.lockByCodes(List.of("a", "b"))).thenReturn(List.of(voucher));
    assertThat(service.lockCodes(List.of("B", "a", "A"))).containsExactly(voucher);
    var order = inOrder(vouchers, em);
    order.verify(vouchers).lockByCodes(List.of("a", "b"));
    order.verify(em).refresh(voucher);
  }

  @Test
  void revocationLocksBookingBeforeVoucher() {
    MemberVoucherEntity voucher = voucher();
    voucher.reserveForBooking("VC0001", NOW);
    BookingEntity booking = BookingEntity.createHold("VC0001", "one_way", 1000, 0, 1000,
        "VND", NOW, NOW.plusMinutes(15));
    when(vouchers.findById(1L)).thenReturn(Optional.of(voucher));
    when(bookings.lockVoucherBookingByCode("VC0001")).thenReturn(Optional.of(booking));
    when(vouchers.lockById(1L)).thenReturn(Optional.of(voucher));
    assertThat(service.lockForRevocation(1L).booking()).isSameAs(booking);
    var order = inOrder(bookings, vouchers);
    order.verify(vouchers).findById(1L);
    order.verify(bookings).lockVoucherBookingByCode("VC0001");
    order.verify(vouchers).lockById(1L);
    verify(em).refresh(voucher);
  }

  @Test
  void changedReservationStopsWithoutLockingAnotherBookingAfterVoucher() {
    MemberVoucherEntity snapshot = voucher();
    MemberVoucherEntity current = voucher();
    current.reserveForBooking("VC0002", NOW);
    when(vouchers.findById(1L)).thenReturn(Optional.of(snapshot));
    when(vouchers.lockById(1L)).thenReturn(Optional.of(current));
    assertThatThrownBy(() -> service.lockForRevocation(1L))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("tải lại");
  }

  private MemberVoucherEntity voucher() {
    return MemberVoucherEntity.create(151L, "TEST", "Voucher", "Kiểm thử", 500, "VND", NOW.plusDays(30), NOW);
  }
}
