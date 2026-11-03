package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import jakarta.persistence.EntityManager;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class VoucherLockService {
  private final MemberVoucherRepository vouchers;
  private final BookingRepository bookings;
  private final EntityManager entityManager;

  public VoucherLockService(MemberVoucherRepository vouchers, BookingRepository bookings, EntityManager entityManager) {
    this.vouchers = vouchers;
    this.bookings = bookings;
    this.entityManager = entityManager;
  }

  public List<MemberVoucherEntity> lockCodes(Collection<String> codes) {
    List<String> normalized = codes.stream().filter(Objects::nonNull)
        .map(code -> code.trim().toLowerCase(Locale.ROOT)).distinct().sorted().toList();
    if (normalized.isEmpty()) {
      return List.of();
    }
    List<MemberVoucherEntity> locked = vouchers.lockByCodes(normalized);
    // Đọc lại sau khóa thay snapshot có thể được nạp trước khi chờ transaction khác.
    locked.forEach(entityManager::refresh);
    return locked;
  }

  public MemberVoucherEntity lockId(Long id) {
    MemberVoucherEntity voucher = vouchers.lockById(id)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy voucher cần thao tác."));
    entityManager.refresh(voucher);
    return voucher;
  }

  public Reservation lockForRevocation(Long id) {
    MemberVoucherEntity snapshot = vouchers.findById(id)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy voucher cần thu hồi."));
    String observedCode = snapshot.isReserved() ? snapshot.getBookingCode() : null;
    BookingEntity booking = null;
    // Khóa booking trước voucher, cùng thứ tự với apply/remove/payment.
    if (observedCode != null) {
      booking = bookings.lockVoucherBookingByCode(observedCode).orElse(null);
      if (booking != null) {
        entityManager.refresh(booking);
      }
    }
    MemberVoucherEntity voucher = lockId(id);
    if (voucher.isReserved() && !Objects.equals(observedCode, voucher.getBookingCode())) {
      throw new BadRequestException("Voucher vừa thay đổi booking giữ chỗ. Vui lòng tải lại và thử thao tác mới.");
    }
    return new Reservation(voucher, booking);
  }

  public record Reservation(MemberVoucherEntity voucher, BookingEntity booking) {
  }
}
