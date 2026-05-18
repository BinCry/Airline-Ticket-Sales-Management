package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BookingHoldRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldResponse;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.dto.PaymentCallbackRequest;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BackofficeSalesService {

  private static final int DEFAULT_LIMIT = 10;
  private static final int MAX_LIMIT = 30;

  private final BookingService bookingService;
  private final PaymentService paymentService;
  private final BookingRepository bookingRepository;
  private final UserAccountRepository userAccountRepository;
  private final AuditLogRepository auditLogRepository;

  public BackofficeSalesService(
      BookingService bookingService,
      PaymentService paymentService,
      BookingRepository bookingRepository,
      UserAccountRepository userAccountRepository,
      AuditLogRepository auditLogRepository
  ) {
    this.bookingService = bookingService;
    this.paymentService = paymentService;
    this.bookingRepository = bookingRepository;
    this.userAccountRepository = userAccountRepository;
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public List<BookingOverviewResponse> getBookings(String bookingCode, String email, Integer limit) {
    String normalizedBookingCode = normalizeBookingCode(bookingCode);
    String normalizedEmail = normalizeEmail(email);
    int safeLimit = normalizeLimit(limit);

    if (normalizedBookingCode != null) {
      return List.of(bookingService.getBookingOverview(normalizedBookingCode));
    }
    if (normalizedEmail == null) {
      throw new BadRequestException("Vui lòng nhập mã đặt chỗ hoặc email liên hệ để tra cứu.");
    }

    List<Long> bookingIds = bookingRepository.findRecentIdsByContactEmail(
        normalizedEmail,
        PageRequest.of(0, safeLimit)
    );
    if (bookingIds.isEmpty()) {
      return List.of();
    }

    Map<Long, Integer> sortOrderById = new LinkedHashMap<>();
    for (int index = 0; index < bookingIds.size(); index++) {
      sortOrderById.put(bookingIds.get(index), index);
    }

    return bookingRepository.findAllDetailedByIdIn(bookingIds).stream()
        .sorted(Comparator.comparingInt(booking -> sortOrderById.getOrDefault(booking.getId(), Integer.MAX_VALUE)))
        .map(bookingService::mapOverviewResponse)
        .toList();
  }

  @Transactional
  public BookingHoldResponse createBooking(AuthenticatedUser actor, BookingHoldRequest request) {
    UserAccountEntity actorAccount = requireActor(actor.userId());
    BookingHoldResponse bookingHoldResponse = bookingService.createHold(request);

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "sales.booking.create",
        "booking",
        bookingHoldResponse.bookingCode(),
        "Nhân viên hỗ trợ tạo giữ chỗ hộ cho khách với mã " + bookingHoldResponse.bookingCode() + ".",
        OffsetDateTime.now()
    ));
    return bookingHoldResponse;
  }

  @Transactional
  public BookingOverviewResponse issueTicket(AuthenticatedUser actor, String bookingCode) {
    String normalizedBookingCode = normalizeBookingCode(bookingCode);
    if (normalizedBookingCode == null) {
      throw new BadRequestException("Mã đặt chỗ không hợp lệ.");
    }

    UserAccountEntity actorAccount = requireActor(actor.userId());
    BookingOverviewResponse bookingOverview = paymentService.handlePaymentCallback(
        new PaymentCallbackRequest(normalizedBookingCode, "success")
    );

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "sales.booking.issue_ticket",
        "booking",
        bookingOverview.bookingCode(),
        "Nhân viên hỗ trợ đã xuất vé cho booking " + bookingOverview.bookingCode() + ".",
        OffsetDateTime.now()
    ));
    return bookingOverview;
  }

  private UserAccountEntity requireActor(Long userId) {
    return userAccountRepository.findOneWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản nội bộ đang thao tác."));
  }

  private String normalizeBookingCode(String bookingCode) {
    if (bookingCode == null || bookingCode.isBlank()) {
      return null;
    }
    return bookingCode.trim().toUpperCase(Locale.ROOT);
  }

  private String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      return null;
    }
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private int normalizeLimit(Integer limit) {
    if (limit == null) {
      return DEFAULT_LIMIT;
    }
    if (limit < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(limit, MAX_LIMIT);
  }
}
