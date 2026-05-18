package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.MyPassengerResponse;
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.domain.dto.UpdateMyProfileRequest;
import com.qlvmb.airticket.domain.dto.UpsertMyPassengerRequest;
import com.qlvmb.airticket.domain.entity.SavedPassengerEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.RefreshSessionRepository;
import com.qlvmb.airticket.repository.SavedPassengerRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class MyAccountServiceTest {

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private SavedPassengerRepository savedPassengerRepository;

  @Mock
  private RefreshSessionRepository refreshSessionRepository;

  @Mock
  private PasswordEncoder passwordEncoder;

  @Mock
  private PasswordPolicyService passwordPolicyService;

  @TempDir
  private Path avatarDir;

  private MyAccountService myAccountService;

  @BeforeEach
  void setUp() {
    myAccountService = new MyAccountService(
        userAccountRepository,
        savedPassengerRepository,
        refreshSessionRepository,
        passwordEncoder,
        passwordPolicyService,
        avatarDir.toString()
    );
  }

  @Test
  void updateMyProfile_shouldTrimDisplayNameAndClearBlankPhone() {
    UserAccountEntity userAccount = createUserAccount();
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        userAccount.getId(),
        userAccount.getEmail(),
        userAccount.getDisplayName(),
        List.of("customer"),
        List.of("customer.self_service")
    );
    when(userAccountRepository.findOneWithRolesById(userAccount.getId())).thenReturn(Optional.of(userAccount));

    MyProfileResponse response = myAccountService.updateMyProfile(
        authenticatedUser,
        new UpdateMyProfileRequest("  Trần Minh Anh  ", "   ")
    );

    assertThat(response.displayName()).isEqualTo("Trần Minh Anh");
    assertThat(response.phone()).isNull();
  }

  @Test
  void createMyPassenger_shouldClearPrimaryFlagOfExistingPassenger() {
    UserAccountEntity userAccount = createUserAccount();
    SavedPassengerEntity existingPrimaryPassenger = SavedPassengerEntity.create(
        userAccount,
        "Nguyễn Văn A",
        "adult",
        LocalDate.of(1991, 5, 20),
        "CCCD",
        "012345678901",
        true,
        OffsetDateTime.now(ZoneOffset.UTC).minusDays(2)
    );
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        userAccount.getId(),
        userAccount.getEmail(),
        userAccount.getDisplayName(),
        List.of("customer"),
        List.of("customer.self_service")
    );
    when(userAccountRepository.findOneWithRolesById(userAccount.getId())).thenReturn(Optional.of(userAccount));
    when(savedPassengerRepository.findAllByUserAccountIdOrderByPrimaryDescCreatedAtDesc(userAccount.getId()))
        .thenReturn(List.of(existingPrimaryPassenger));
    when(savedPassengerRepository.save(any(SavedPassengerEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    MyPassengerResponse response = myAccountService.createMyPassenger(
        authenticatedUser,
        new UpsertMyPassengerRequest(
            "  Trần Bé Bông  ",
            "ADULT",
            LocalDate.of(2015, 9, 14),
            "hộ chiếu",
            " ab123456 ",
            true
        )
    );

    assertThat(existingPrimaryPassenger.isPrimary()).isFalse();
    assertThat(response.fullName()).isEqualTo("Trần Bé Bông");
    assertThat(response.passengerType()).isEqualTo("adult");
    assertThat(response.documentType()).isEqualTo("HỘ CHIẾU");
    assertThat(response.documentNumber()).isEqualTo("AB123456");
    assertThat(response.isPrimary()).isTrue();
    verify(savedPassengerRepository).save(any(SavedPassengerEntity.class));
  }

  @Test
  void updateMyPassenger_shouldKeepPrimaryFlagWhenEditingCurrentPrimaryPassenger() {
    UserAccountEntity userAccount = createUserAccount();
    SavedPassengerEntity currentPrimaryPassenger = SavedPassengerEntity.create(
        userAccount,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1991, 5, 20),
        "CCCD",
        "012345678901",
        true,
        OffsetDateTime.now(ZoneOffset.UTC).minusDays(2)
    );
    setField(currentPrimaryPassenger, "id", 301L);
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        userAccount.getId(),
        userAccount.getEmail(),
        userAccount.getDisplayName(),
        List.of("customer"),
        List.of("customer.self_service")
    );
    when(userAccountRepository.findOneWithRolesById(userAccount.getId())).thenReturn(Optional.of(userAccount));
    when(savedPassengerRepository.findByIdAndUserAccountId(301L, userAccount.getId()))
        .thenReturn(Optional.of(currentPrimaryPassenger));
    when(savedPassengerRepository.findAllByUserAccountIdOrderByPrimaryDescCreatedAtDesc(userAccount.getId()))
        .thenReturn(List.of(currentPrimaryPassenger));

    MyPassengerResponse response = myAccountService.updateMyPassenger(
        authenticatedUser,
        301L,
        new UpsertMyPassengerRequest(
            "  Nguyen Van A Moi  ",
            "adult",
            LocalDate.of(1991, 5, 20),
            "passport",
            " b1234567 ",
            true
        )
    );

    assertThat(response.fullName()).isEqualTo("Nguyen Van A Moi");
    assertThat(response.documentType()).isEqualTo("PASSPORT");
    assertThat(response.documentNumber()).isEqualTo("B1234567");
    assertThat(response.isPrimary()).isTrue();
    verify(savedPassengerRepository, never()).save(any(SavedPassengerEntity.class));
  }

  @Test
  void deleteMyPassenger_shouldDeleteOwnedPassenger() {
    UserAccountEntity userAccount = createUserAccount();
    SavedPassengerEntity savedPassenger = SavedPassengerEntity.create(
        userAccount,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1991, 5, 20),
        "CCCD",
        "012345678901",
        false,
        OffsetDateTime.now(ZoneOffset.UTC).minusDays(2)
    );
    setField(savedPassenger, "id", 401L);
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        userAccount.getId(),
        userAccount.getEmail(),
        userAccount.getDisplayName(),
        List.of("customer"),
        List.of("customer.self_service")
    );
    when(userAccountRepository.findOneWithRolesById(userAccount.getId())).thenReturn(Optional.of(userAccount));
    when(savedPassengerRepository.findByIdAndUserAccountId(401L, userAccount.getId()))
        .thenReturn(Optional.of(savedPassenger));

    myAccountService.deleteMyPassenger(authenticatedUser, 401L);

    verify(savedPassengerRepository).delete(eq(savedPassenger));
  }

  private UserAccountEntity createUserAccount() {
    UserAccountEntity userAccount = UserAccountEntity.register(
        "khach@example.com",
        "hashed-password",
        "Khách Hàng",
        "0909123456",
        "active",
        OffsetDateTime.now(ZoneOffset.UTC)
    );
    setField(userAccount, "id", 101L);
    return userAccount;
  }

  private void setField(Object target, String fieldName, Object value) {
    try {
      java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException("Không thể chuẩn bị dữ liệu kiểm thử.", exception);
    }
  }
}
