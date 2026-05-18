package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.ChangePasswordRequest;
import com.qlvmb.airticket.domain.dto.MyPassengerResponse;
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.domain.dto.UpdateMyProfileRequest;
import com.qlvmb.airticket.domain.dto.UpsertMyPassengerRequest;
import com.qlvmb.airticket.domain.entity.SavedPassengerEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.RefreshSessionRepository;
import com.qlvmb.airticket.repository.SavedPassengerRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MyAccountService {

  private static final long MAX_AVATAR_BYTES = 2L * 1024L * 1024L;
  private static final Set<String> ALLOWED_PASSENGER_TYPES = Set.of("adult", "child", "infant");
  private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

  private final UserAccountRepository userAccountRepository;
  private final SavedPassengerRepository savedPassengerRepository;
  private final RefreshSessionRepository refreshSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final PasswordPolicyService passwordPolicyService;
  private final Path avatarRoot;

  public MyAccountService(
      UserAccountRepository userAccountRepository,
      SavedPassengerRepository savedPassengerRepository,
      RefreshSessionRepository refreshSessionRepository,
      PasswordEncoder passwordEncoder,
      PasswordPolicyService passwordPolicyService,
      @Value("${app.upload.avatar-dir:uploads/avatars}") String avatarDir
  ) {
    this.userAccountRepository = userAccountRepository;
    this.savedPassengerRepository = savedPassengerRepository;
    this.refreshSessionRepository = refreshSessionRepository;
    this.passwordEncoder = passwordEncoder;
    this.passwordPolicyService = passwordPolicyService;
    this.avatarRoot = Path.of(avatarDir).toAbsolutePath().normalize();
  }

  @Transactional
  public MyProfileResponse updateMyProfile(AuthenticatedUser authenticatedUser, UpdateMyProfileRequest request) {
    UserAccountEntity userAccount = requireUserAccount(authenticatedUser.userId());
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    userAccount.updateProfile(
        normalizeDisplayName(request.displayName()),
        normalizePhone(request.phone()),
        now
    );
    return toProfileResponse(userAccount);
  }

  @Transactional
  public void changePassword(AuthenticatedUser authenticatedUser, ChangePasswordRequest request) {
    UserAccountEntity userAccount = requireUserAccount(authenticatedUser.userId());
    if (!passwordEncoder.matches(request.currentPassword(), userAccount.getPasswordHash())) {
      throw new BadRequestException("Mật khẩu hiện tại không đúng.");
    }
    if (passwordEncoder.matches(request.newPassword(), userAccount.getPasswordHash())) {
      throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }

    passwordPolicyService.validate(
        request.newPassword(),
        userAccount.getEmail(),
        userAccount.getDisplayName(),
        userAccount.getPhone()
    );

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    userAccount.updatePassword(passwordEncoder.encode(request.newPassword()), now);
    refreshSessionRepository.findAllByUserAccountIdAndRevokedAtIsNull(userAccount.getId())
        .forEach(refreshSession -> refreshSession.revoke(now));
  }

  @Transactional
  public MyProfileResponse updateAvatar(AuthenticatedUser authenticatedUser, MultipartFile avatar) {
    UserAccountEntity userAccount = requireUserAccount(authenticatedUser.userId());
    validateAvatar(avatar);

    String extension = resolveAvatarExtension(avatar.getContentType());
    String fileName = userAccount.getId() + "-" + UUID.randomUUID() + extension;
    Path targetPath = avatarRoot.resolve(fileName).normalize();
    if (!targetPath.startsWith(avatarRoot)) {
      throw new BadRequestException("Tên tệp ảnh đại diện không hợp lệ.");
    }

    try {
      Files.createDirectories(avatarRoot);
      avatar.transferTo(targetPath);
    } catch (IOException exception) {
      throw new IllegalStateException("Không thể lưu ảnh đại diện vào lúc này.");
    }

    userAccount.updateAvatar("/uploads/avatars/" + fileName, OffsetDateTime.now(ZoneOffset.UTC));
    return toProfileResponse(userAccount);
  }

  @Transactional(readOnly = true)
  public List<MyPassengerResponse> getMyPassengers(AuthenticatedUser authenticatedUser) {
    requireUserAccount(authenticatedUser.userId());
    return savedPassengerRepository.findAllByUserAccountIdOrderByPrimaryDescCreatedAtDesc(authenticatedUser.userId()).stream()
        .map(this::toPassengerResponse)
        .toList();
  }

  @Transactional
  public MyPassengerResponse createMyPassenger(AuthenticatedUser authenticatedUser, UpsertMyPassengerRequest request) {
    UserAccountEntity userAccount = requireUserAccount(authenticatedUser.userId());
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    clearExistingPrimaryPassengers(userAccount.getId(), request.isPrimary(), now);

    SavedPassengerEntity savedPassenger = SavedPassengerEntity.create(
        userAccount,
        normalizeFullName(request.fullName()),
        normalizePassengerType(request.passengerType()),
        request.dateOfBirth(),
        normalizeDocumentType(request.documentType()),
        normalizeDocumentNumber(request.documentNumber()),
        request.isPrimary(),
        now
    );
    return toPassengerResponse(savedPassengerRepository.save(savedPassenger));
  }

  @Transactional
  public MyPassengerResponse updateMyPassenger(
      AuthenticatedUser authenticatedUser,
      Long passengerId,
      UpsertMyPassengerRequest request
  ) {
    UserAccountEntity userAccount = requireUserAccount(authenticatedUser.userId());
    SavedPassengerEntity savedPassenger = savedPassengerRepository.findByIdAndUserAccountId(passengerId, userAccount.getId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy hành khách thường dùng."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    clearExistingPrimaryPassengers(userAccount.getId(), request.isPrimary(), now, passengerId);

    savedPassenger.update(
        normalizeFullName(request.fullName()),
        normalizePassengerType(request.passengerType()),
        request.dateOfBirth(),
        normalizeDocumentType(request.documentType()),
        normalizeDocumentNumber(request.documentNumber()),
        request.isPrimary(),
        now
    );
    return toPassengerResponse(savedPassenger);
  }

  @Transactional
  public void deleteMyPassenger(AuthenticatedUser authenticatedUser, Long passengerId) {
    UserAccountEntity userAccount = requireUserAccount(authenticatedUser.userId());
    SavedPassengerEntity savedPassenger = savedPassengerRepository.findByIdAndUserAccountId(passengerId, userAccount.getId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy hành khách thường dùng."));
    savedPassengerRepository.delete(savedPassenger);
  }

  private UserAccountEntity requireUserAccount(Long userId) {
    return userAccountRepository.findOneWithRolesById(userId)
        .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản."));
  }

  private void validateAvatar(MultipartFile avatar) {
    if (avatar == null || avatar.isEmpty()) {
      throw new BadRequestException("Vui lòng chọn ảnh đại diện.");
    }
    if (avatar.getSize() > MAX_AVATAR_BYTES) {
      throw new BadRequestException("Ảnh đại diện không được vượt quá 2 MB.");
    }
    String contentType = avatar.getContentType();
    if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw new BadRequestException("Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WEBP.");
    }
  }

  private String resolveAvatarExtension(String contentType) {
    return switch (contentType == null ? "" : contentType.toLowerCase(Locale.ROOT)) {
      case "image/jpeg" -> ".jpg";
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      default -> throw new BadRequestException("Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WEBP.");
    };
  }

  private void clearExistingPrimaryPassengers(Long userId, boolean makePrimary, OffsetDateTime updatedAt) {
    clearExistingPrimaryPassengers(userId, makePrimary, updatedAt, null);
  }

  private void clearExistingPrimaryPassengers(Long userId, boolean makePrimary, OffsetDateTime updatedAt, Long ignoredPassengerId) {
    if (!makePrimary) {
      return;
    }
    savedPassengerRepository.findAllByUserAccountIdOrderByPrimaryDescCreatedAtDesc(userId).forEach(savedPassenger -> {
      if (ignoredPassengerId != null && ignoredPassengerId.equals(savedPassenger.getId())) {
        return;
      }
      savedPassenger.clearPrimary(updatedAt);
    });
  }

  private MyProfileResponse toProfileResponse(UserAccountEntity userAccount) {
    return new MyProfileResponse(
        userAccount.getId(),
        userAccount.getEmail(),
        DisplayNamePresentationSupport.present(userAccount.getDisplayName()),
        userAccount.getPhone(),
        userAccount.getAvatarUrl(),
        userAccount.isEmailVerified(),
        userAccount.getStatus(),
        userAccount.getRoles().stream()
            .map(role -> role.getCode())
            .sorted()
            .toList()
    );
  }

  private MyPassengerResponse toPassengerResponse(SavedPassengerEntity savedPassenger) {
    return new MyPassengerResponse(
        savedPassenger.getId(),
        savedPassenger.getFullName(),
        savedPassenger.getPassengerType(),
        savedPassenger.getDateOfBirth(),
        savedPassenger.getDocumentType(),
        savedPassenger.getDocumentNumber(),
        savedPassenger.isPrimary()
    );
  }

  private String normalizeDisplayName(String displayName) {
    String normalizedDisplayName = displayName.trim();
    if (normalizedDisplayName.isBlank()) {
      throw new BadRequestException("Tên hiển thị không được để trống.");
    }
    return normalizedDisplayName;
  }

  private String normalizePhone(String phone) {
    if (phone == null || phone.isBlank()) {
      return null;
    }
    return phone.trim();
  }

  private String normalizeFullName(String fullName) {
    String normalizedFullName = fullName.trim();
    if (normalizedFullName.isBlank()) {
      throw new BadRequestException("Họ tên hành khách không được để trống.");
    }
    return normalizedFullName;
  }

  private String normalizePassengerType(String passengerType) {
    String normalizedPassengerType = passengerType.trim().toLowerCase(Locale.ROOT);
    if (!ALLOWED_PASSENGER_TYPES.contains(normalizedPassengerType)) {
      throw new BadRequestException("Loại hành khách phải là adult, child hoặc infant.");
    }
    return normalizedPassengerType;
  }

  private String normalizeDocumentType(String documentType) {
    String normalizedDocumentType = documentType.trim().toUpperCase(Locale.ROOT);
    if (normalizedDocumentType.isBlank()) {
      throw new BadRequestException("Loại giấy tờ không được để trống.");
    }
    return normalizedDocumentType;
  }

  private String normalizeDocumentNumber(String documentNumber) {
    String normalizedDocumentNumber = documentNumber.trim().toUpperCase(Locale.ROOT);
    if (normalizedDocumentNumber.isBlank()) {
      throw new BadRequestException("Số giấy tờ không được để trống.");
    }
    return normalizedDocumentNumber;
  }
}
