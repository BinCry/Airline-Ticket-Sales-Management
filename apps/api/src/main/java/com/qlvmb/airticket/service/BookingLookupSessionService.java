package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BookingLookupOtpResponse;
import com.qlvmb.airticket.domain.dto.BookingLookupRequestOtpRequest;
import com.qlvmb.airticket.domain.dto.BookingLookupVerifyOtpRequest;
import com.qlvmb.airticket.domain.dto.BookingLookupVerifyOtpResponse;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingLookupSessionEntity;
import com.qlvmb.airticket.domain.entity.OtpChallengeEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.BookingLookupSessionRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.OtpChallengeRepository;
import com.qlvmb.airticket.security.OtpChannelCode;
import com.qlvmb.airticket.security.OtpPurposeCode;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingLookupSessionService {

  private static final String LOOKUP_NOT_ALLOWED_MESSAGE =
      "Bạn cần xác minh OTP tra cứu đặt chỗ để tiếp tục thao tác này.";
  private static final String LOOKUP_OTP_INVALID_MESSAGE =
      "Mã OTP tra cứu không hợp lệ hoặc đã hết hạn.";
  private static final String LOOKUP_OTP_REQUEST_LIMIT_MESSAGE =
      "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau ít phút.";
  private static final String LOOKUP_OTP_VERIFY_LIMIT_MESSAGE =
      "Bạn đã nhập OTP sai quá nhiều lần. Vui lòng yêu cầu OTP mới.";
  private static final String LOOKUP_OWNER_MISMATCH_MESSAGE =
      "Thông tin booking hoặc email tra cứu không khớp với dữ liệu hệ thống.";
  private static final String LOOKUP_BOOKING_NOT_FOUND_MESSAGE =
      "Không tìm thấy đặt chỗ tương ứng với thông tin đã nhập.";

  private final BookingRepository bookingRepository;
  private final OtpChallengeRepository otpChallengeRepository;
  private final BookingLookupSessionRepository bookingLookupSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final OtpDeliveryService otpDeliveryService;
  private final SecureRandom secureRandom = new SecureRandom();
  private final int otpMaxAttempts;
  private final long lookupOtpTtlSeconds;
  private final long lookupSessionTtlSeconds;
  private final int otpRequestLimitPerWindow;
  private final int otpVerifyLimitPerWindow;
  private final long otpRateLimitWindowSeconds;

  public BookingLookupSessionService(
      BookingRepository bookingRepository,
      OtpChallengeRepository otpChallengeRepository,
      BookingLookupSessionRepository bookingLookupSessionRepository,
      PasswordEncoder passwordEncoder,
      OtpDeliveryService otpDeliveryService,
      @Value("${app.auth.otp.max-attempts}") int otpMaxAttempts,
      @Value("${app.auth.otp.booking-lookup-ttl-seconds:300}") long lookupOtpTtlSeconds,
      @Value("${app.auth.otp.booking-lookup-session-ttl-seconds:1800}") long lookupSessionTtlSeconds,
      @Value("${app.auth.otp.booking-lookup-request-limit-per-window:5}") int otpRequestLimitPerWindow,
      @Value("${app.auth.otp.booking-lookup-verify-limit-per-window:8}") int otpVerifyLimitPerWindow,
      @Value("${app.auth.otp.booking-lookup-rate-limit-window-seconds:900}") long otpRateLimitWindowSeconds
  ) {
    this.bookingRepository = bookingRepository;
    this.otpChallengeRepository = otpChallengeRepository;
    this.bookingLookupSessionRepository = bookingLookupSessionRepository;
    this.passwordEncoder = passwordEncoder;
    this.otpDeliveryService = otpDeliveryService;
    this.otpMaxAttempts = otpMaxAttempts;
    this.lookupOtpTtlSeconds = lookupOtpTtlSeconds;
    this.lookupSessionTtlSeconds = lookupSessionTtlSeconds;
    this.otpRequestLimitPerWindow = otpRequestLimitPerWindow;
    this.otpVerifyLimitPerWindow = otpVerifyLimitPerWindow;
    this.otpRateLimitWindowSeconds = otpRateLimitWindowSeconds;
  }

  @Transactional
  public BookingLookupOtpResponse requestLookupOtp(BookingLookupRequestOtpRequest request) {
    String bookingCode = normalizeBookingCode(request.bookingCode());
    String email = normalizeEmail(request.email());
    BookingEntity booking = requireBookingAndOwner(bookingCode, email);
    String targetKey = buildTargetKey(bookingCode, email);
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    enforceRequestRateLimit(targetKey, now);

    String otp = generateOtp();
    OtpChallengeEntity otpChallenge = OtpChallengeEntity.issue(
        null,
        OtpChannelCode.EMAIL,
        OtpPurposeCode.BOOKING_LOOKUP,
        targetKey,
        passwordEncoder.encode(otp),
        now.plusSeconds(lookupOtpTtlSeconds),
        now
    );
    otpChallengeRepository.save(otpChallenge);
    otpDeliveryService.sendBookingLookupOtp(email, otp, booking.getBookingCode());

    return new BookingLookupOtpResponse("accepted", "Mã OTP tra cứu đã được gửi đến email liên hệ.");
  }

  @Transactional
  public BookingLookupVerifyOtpResponse verifyLookupOtp(BookingLookupVerifyOtpRequest request) {
    String bookingCode = normalizeBookingCode(request.bookingCode());
    String email = normalizeEmail(request.email());
    requireBookingAndOwner(bookingCode, email);
    String targetKey = buildTargetKey(bookingCode, email);
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    enforceVerifyRateLimit(targetKey, now);
    OtpChallengeEntity challenge = requireActiveChallenge(targetKey, now);
    validateOtpValue(challenge, request.otp(), now);

    challenge.markVerified(now);
    challenge.consume(now);

    BookingLookupSessionEntity session = BookingLookupSessionEntity.issue(
        bookingCode,
        email,
        generateLookupToken(),
        now.plusSeconds(lookupSessionTtlSeconds),
        now
    );
    bookingLookupSessionRepository.save(session);

    return new BookingLookupVerifyOtpResponse("verified", session.getTokenKey(), session.getExpiresAt());
  }

  @Transactional
  public void assertLookupSessionAllowed(
      String bookingCode,
      String contactEmail,
      String lookupToken
  ) {
    if (lookupToken == null || lookupToken.isBlank()) {
      throw new UnauthorizedException(LOOKUP_NOT_ALLOWED_MESSAGE);
    }

    String normalizedBookingCode = normalizeBookingCode(bookingCode);
    String normalizedEmail = normalizeEmail(contactEmail);
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    BookingLookupSessionEntity session = bookingLookupSessionRepository.findByTokenKey(lookupToken.trim())
        .orElseThrow(() -> new UnauthorizedException(LOOKUP_NOT_ALLOWED_MESSAGE));

    if (session.isConsumed() || session.isExpired(now)) {
      if (!session.isConsumed()) {
        session.consume(now);
      }
      throw new UnauthorizedException(LOOKUP_NOT_ALLOWED_MESSAGE);
    }

    if (!normalizedBookingCode.equals(session.getBookingCode())
        || !normalizedEmail.equals(session.getContactEmail())) {
      throw new UnauthorizedException(LOOKUP_NOT_ALLOWED_MESSAGE);
    }
  }

  @Transactional
  public void assertLookupSessionAllowed(String bookingCode, String lookupToken) {
    String normalizedBookingCode = normalizeBookingCode(bookingCode);
    BookingEntity booking = bookingRepository.findDetailedByBookingCode(normalizedBookingCode)
        .orElseThrow(() -> new UnauthorizedException(LOOKUP_NOT_ALLOWED_MESSAGE));
    BookingContactEntity contact = booking.getContact();
    if (contact == null || contact.getEmail() == null || contact.getEmail().isBlank()) {
      throw new UnauthorizedException(LOOKUP_NOT_ALLOWED_MESSAGE);
    }

    assertLookupSessionAllowed(normalizedBookingCode, normalizeEmail(contact.getEmail()), lookupToken);
  }

  private BookingEntity requireBookingAndOwner(String bookingCode, String email) {
    BookingEntity booking = bookingRepository.findDetailedByBookingCode(bookingCode)
        .orElseThrow(() -> new NotFoundException(LOOKUP_BOOKING_NOT_FOUND_MESSAGE));

    BookingContactEntity contact = booking.getContact();
    if (contact == null || !email.equalsIgnoreCase(contact.getEmail())) {
      throw new BadRequestException(LOOKUP_OWNER_MISMATCH_MESSAGE);
    }
    return booking;
  }

  private OtpChallengeEntity requireActiveChallenge(String targetKey, OffsetDateTime now) {
    OtpChallengeEntity challenge = otpChallengeRepository
        .findFirstByTargetValueAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
            targetKey,
            OtpPurposeCode.BOOKING_LOOKUP
        )
        .orElseThrow(() -> new BadRequestException(LOOKUP_OTP_INVALID_MESSAGE));

    if (challenge.isConsumed() || challenge.isExpired(now)) {
      if (!challenge.isConsumed()) {
        challenge.consume(now);
      }
      throw new BadRequestException(LOOKUP_OTP_INVALID_MESSAGE);
    }
    return challenge;
  }

  private void validateOtpValue(OtpChallengeEntity challenge, String otp, OffsetDateTime now) {
    if (!passwordEncoder.matches(otp, challenge.getOtpHash())) {
      challenge.incrementAttempt();
      if (challenge.getAttemptCount() >= otpMaxAttempts) {
        challenge.consume(now);
      }
      throw new BadRequestException(LOOKUP_OTP_INVALID_MESSAGE);
    }
  }

  private void enforceRequestRateLimit(String targetKey, OffsetDateTime now) {
    long requestCount = otpChallengeRepository.countByTargetValueAndPurposeAndCreatedAtAfter(
        targetKey,
        OtpPurposeCode.BOOKING_LOOKUP,
        now.minusSeconds(otpRateLimitWindowSeconds)
    );
    if (requestCount >= otpRequestLimitPerWindow) {
      throw new BadRequestException(LOOKUP_OTP_REQUEST_LIMIT_MESSAGE);
    }
  }

  private void enforceVerifyRateLimit(String targetKey, OffsetDateTime now) {
    long verifyCount = bookingLookupSessionRepository.countByBookingCodeAndContactEmailAndCreatedAtAfter(
        extractBookingCode(targetKey),
        extractContactEmail(targetKey),
        now.minusSeconds(otpRateLimitWindowSeconds)
    );
    if (verifyCount >= otpVerifyLimitPerWindow) {
      throw new BadRequestException(LOOKUP_OTP_VERIFY_LIMIT_MESSAGE);
    }
  }

  private String buildTargetKey(String bookingCode, String email) {
    return bookingCode + "|" + email;
  }

  private String extractBookingCode(String targetKey) {
    int separatorIndex = targetKey.indexOf('|');
    return separatorIndex <= 0 ? targetKey : targetKey.substring(0, separatorIndex);
  }

  private String extractContactEmail(String targetKey) {
    int separatorIndex = targetKey.indexOf('|');
    return separatorIndex < 0 ? "" : targetKey.substring(separatorIndex + 1);
  }

  private String normalizeBookingCode(String bookingCode) {
    String normalized = bookingCode == null ? "" : bookingCode.trim().toUpperCase(Locale.ROOT);
    if (!normalized.matches("^[A-Z0-9]{6}$")) {
      throw new BadRequestException(LOOKUP_BOOKING_NOT_FOUND_MESSAGE);
    }
    return normalized;
  }

  private String normalizeEmail(String email) {
    String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    if (normalized.isBlank()) {
      throw new BadRequestException(LOOKUP_OWNER_MISMATCH_MESSAGE);
    }
    return normalized;
  }

  private String generateOtp() {
    return "%06d".formatted(secureRandom.nextInt(1_000_000));
  }

  private String generateLookupToken() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}
