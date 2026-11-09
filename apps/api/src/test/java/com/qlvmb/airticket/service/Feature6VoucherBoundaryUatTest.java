package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.*;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class Feature6VoucherBoundaryUatTest {
  private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-09T00:00:00Z");
  private final VoucherConditionService conditions = new VoucherConditionService(
      new ObjectMapper().findAndRegisterModules(), mock(AirportRepository.class), new ProductCatalogService());

  private BookingEntity booking(long amount) {
    var b = BookingEntity.createHold("TC1701", "round_trip", amount, 0, amount, "VND", NOW, NOW.plusMinutes(15));
    b.assignContact(BookingContactEntity.create(b, "Hội viên kiểm thử", "member@example.test", "0900000000"));
    return b;
  }

  private MemberVoucherEntity voucher(String code) {
    return MemberVoucherEntity.create(151L, code, "Voucher kiểm thử", "Dữ liệu TC", 10000, "VND", NOW.plusDays(30), NOW);
  }

  @ParameterizedTest
  @ValueSource(strings = {"thuong_gia", "pho_thong_tiet_kiem"})
  void tc11FareMustMatchOnTheSelectedSegment(String fare) {
    var b = booking(200000);
    var s = BeanUtils.instantiateClass(BookingSegmentEntity.class);
    ReflectionTestUtils.setField(s, "originCode", "SGN");
    ReflectionTestUtils.setField(s, "destinationCode", "HAN");
    ReflectionTestUtils.setField(s, "fareFamily", fare);
    ReflectionTestUtils.setField(s, "departureAt", NOW);
    b.getSegments().add(s);
    var v = voucher("FARE");
    v.updateConditions("{\"fareFamilies\":[\"thuong_gia\"]}");
    if ("thuong_gia".equals(fare)) {
      assertThatCode(() -> conditions.requireEligible(v, b)).doesNotThrowAnyException();
    } else {
      assertThatThrownBy(() -> conditions.requireEligible(v, b)).isInstanceOf(BadRequestException.class);
    }
  }

  @ParameterizedTest
  @ValueSource(longs = {199999, 200000, 200001})
  void tc13BelowEqualAndAboveFixedMinimum(long subtotal) {
    var b = booking(subtotal);
    b.applyVoucher("OLD", 10000, NOW);
    var v = voucher("MINIMUM");
    v.updateConditions("{\"minAmount\":200000}");
    if (subtotal < 200000) {
      assertThatThrownBy(() -> conditions.requireEligible(v, b)).isInstanceOf(BadRequestException.class);
    } else {
      assertThatCode(() -> conditions.requireEligible(v, b)).doesNotThrowAnyException();
    }
    assertThat(b.getAppliedVoucherCode()).isEqualTo("OLD");
    assertThat(b.getTotalAmount()).isEqualTo(subtotal - 10000);
  }

  @ParameterizedTest
  @ValueSource(strings = {"MISSING", "USED", "REVOKED", "EXPIRED", "RESERVED_OTHER"})
  void tc17RejectedCandidatePreservesPreviousVoucherAndBooking(String state) {
    var users = mock(UserAccountRepository.class);
    var repository = mock(MemberVoucherRepository.class);
    var locks = mock(VoucherLockService.class);
    var service = new MemberVoucherService(users, repository, conditions, locks);
    var role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", "member");
    var user = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(user, "id", 151L);
    ReflectionTestUtils.setField(user, "email", "member@example.test");
    ReflectionTestUtils.setField(user, "roles", Set.of(role));
    when(users.findOneWithRolesById(151L)).thenReturn(Optional.of(user));
    var b = booking(200000);
    var old = voucher("OLD");
    old.reserveForBooking(b.getBookingCode(), NOW);
    b.applyVoucher("OLD", 10000, NOW);
    var candidate = voucher("NEW");
    if ("RESERVED_OTHER".equals(state)) {
      candidate.reserveForBooking("OTHER1", NOW);
    } else if (!"MISSING".equals(state)) {
      ReflectionTestUtils.setField(candidate, "status", state);
      if ("EXPIRED".equals(state)) ReflectionTestUtils.setField(candidate, "expiresAt", NOW.minusSeconds(1));
    }
    when(locks.lockCodes(List.of("OLD", "NEW"))).thenReturn(
        "MISSING".equals(state) ? List.of(old) : List.of(old, candidate));
    var auth = new AuthenticatedUser(151L, "member@example.test", "Hội viên kiểm thử", List.of("member"), List.of());
    assertThatThrownBy(() -> service.applyVoucherToBooking(auth, b, "NEW", NOW))
        .isInstanceOf("MISSING".equals(state) ? NotFoundException.class : BadRequestException.class);
    assertThat(b.getAppliedVoucherCode()).isEqualTo("OLD");
    assertThat(b.getDiscountAmount()).isEqualTo(10000);
    assertThat(b.getTotalAmount()).isEqualTo(190000);
    assertThat(old.isReservedForBooking(b.getBookingCode())).isTrue();
    if ("RESERVED_OTHER".equals(state)) assertThat(candidate.isReservedForBooking("OTHER1")).isTrue();
    verifyNoInteractions(repository);
  }
}
