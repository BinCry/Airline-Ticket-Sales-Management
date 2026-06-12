package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.AuthProviderIdentityEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AuthProviderIdentityRepository;
import com.qlvmb.airticket.repository.OAuthTemporaryCodeRepository;
import com.qlvmb.airticket.repository.RoleRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.RoleCode;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class OAuthLoginServiceTest {

  @Mock
  private OAuthTemporaryCodeRepository temporaryCodeRepository;

  @Mock
  private AuthProviderIdentityRepository providerIdentityRepository;

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private RoleRepository roleRepository;

  @Mock
  private PasswordEncoder passwordEncoder;

  @Mock
  private AuthService authService;

  private OAuthLoginService oAuthLoginService;

  @BeforeEach
  void setUp() {
    oAuthLoginService = new OAuthLoginService(
        temporaryCodeRepository,
        providerIdentityRepository,
        userAccountRepository,
        roleRepository,
        passwordEncoder,
        authService,
        "google-client-id",
        "google-client-secret",
        "http://localhost:8080/api/auth/oauth/google/callback",
        "http://localhost:3000/oauth/callback",
        300,
        180
    );
  }

  @Test
  void findOrCreateGoogleUser_shouldLinkVerifiedGoogleEmailToExistingLocalUser() throws Exception {
    UserAccountEntity existingUser = createUserAccount("khach@example.com");
    Object userInfo = createGoogleUserInfo(
        "google-sub-1",
        "KHACH@example.com",
        "Khach Google",
        "https://example.com/avatar.png",
        true
    );
    when(providerIdentityRepository.findOneWithUserAccountByProviderAndProviderSubject(
        AuthProviderIdentityEntity.PROVIDER_GOOGLE,
        "google-sub-1"
    )).thenReturn(Optional.empty());
    when(userAccountRepository.findByEmailIgnoreCase("khach@example.com")).thenReturn(Optional.of(existingUser));

    UserAccountEntity result = invokeFindOrCreateGoogleUser(userInfo);

    assertThat(result).isSameAs(existingUser);
    assertThat(existingUser.isEmailVerified()).isTrue();
    assertThat(existingUser.getAvatarUrl()).isEqualTo("https://example.com/avatar.png");
    assertThat(existingUser.getLastLoginAt()).isNotNull();
    verify(userAccountRepository, never()).save(any(UserAccountEntity.class));
    ArgumentCaptor<AuthProviderIdentityEntity> identityCaptor =
        ArgumentCaptor.forClass(AuthProviderIdentityEntity.class);
    verify(providerIdentityRepository).save(identityCaptor.capture());
    assertThat(identityCaptor.getValue().getUserAccount()).isSameAs(existingUser);
    assertThat(identityCaptor.getValue().getEmail()).isEqualTo("khach@example.com");
    assertThat(identityCaptor.getValue().getProviderSubject()).isEqualTo("google-sub-1");
  }

  @Test
  void findOrCreateGoogleUser_shouldNotLinkUnverifiedGoogleEmailToExistingLocalUser() throws Exception {
    RoleEntity customerRole = createRole(RoleCode.CUSTOMER);
    Object userInfo = createGoogleUserInfo(
        "google-sub-2",
        "khach@example.com",
        "Khach Google",
        null,
        false
    );
    when(providerIdentityRepository.findOneWithUserAccountByProviderAndProviderSubject(
        AuthProviderIdentityEntity.PROVIDER_GOOGLE,
        "google-sub-2"
    )).thenReturn(Optional.empty());
    when(roleRepository.findByCode(RoleCode.CUSTOMER)).thenReturn(Optional.of(customerRole));
    when(passwordEncoder.encode(any(String.class))).thenReturn("hashed-random-password");
    when(userAccountRepository.save(any(UserAccountEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    UserAccountEntity result = invokeFindOrCreateGoogleUser(userInfo);

    assertThat(result.getEmail()).startsWith("google-").endsWith("@oauth.local");
    assertThat(result.isEmailVerified()).isFalse();
    assertThat(result.getRoles()).contains(customerRole);
    verify(userAccountRepository, never()).findByEmailIgnoreCase("khach@example.com");
    verify(providerIdentityRepository).save(any(AuthProviderIdentityEntity.class));
  }

  @Test
  void findOrCreateGoogleUser_shouldStoreVerifiedGoogleEmailForNewOAuthUser() throws Exception {
    RoleEntity customerRole = createRole(RoleCode.CUSTOMER);
    Object userInfo = createGoogleUserInfo(
        "google-sub-3",
        "KHACHMOI@example.com",
        "Khach Moi",
        null,
        true
    );
    when(providerIdentityRepository.findOneWithUserAccountByProviderAndProviderSubject(
        AuthProviderIdentityEntity.PROVIDER_GOOGLE,
        "google-sub-3"
    )).thenReturn(Optional.empty());
    when(userAccountRepository.findByEmailIgnoreCase("khachmoi@example.com")).thenReturn(Optional.empty());
    when(roleRepository.findByCode(RoleCode.CUSTOMER)).thenReturn(Optional.of(customerRole));
    when(passwordEncoder.encode(any(String.class))).thenReturn("hashed-random-password");
    when(userAccountRepository.save(any(UserAccountEntity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    UserAccountEntity result = invokeFindOrCreateGoogleUser(userInfo);

    assertThat(result.getEmail()).isEqualTo("khachmoi@example.com");
    assertThat(result.isEmailVerified()).isTrue();
    assertThat(result.getRoles()).contains(customerRole);
    verify(providerIdentityRepository).save(any(AuthProviderIdentityEntity.class));
  }

  private UserAccountEntity invokeFindOrCreateGoogleUser(Object userInfo) throws Exception {
    Method method = OAuthLoginService.class.getDeclaredMethod(
        "findOrCreateGoogleUser",
        userInfo.getClass()
    );
    method.setAccessible(true);
    return (UserAccountEntity) method.invoke(oAuthLoginService, userInfo);
  }

  private Object createGoogleUserInfo(
      String sub,
      String email,
      String name,
      String picture,
      Boolean emailVerified
  ) throws Exception {
    Class<?> userInfoClass = Class.forName(
        "com.qlvmb.airticket.service.OAuthLoginService$GoogleUserInfoResponse"
    );
    Constructor<?> constructor = userInfoClass.getDeclaredConstructor(
        String.class,
        String.class,
        String.class,
        String.class,
        Boolean.class
    );
    constructor.setAccessible(true);
    return constructor.newInstance(sub, email, name, picture, emailVerified);
  }

  private UserAccountEntity createUserAccount(String email) {
    UserAccountEntity userAccount = UserAccountEntity.register(
        email,
        "hashed-password",
        "Khach Hang",
        null,
        "active",
        OffsetDateTime.now(ZoneOffset.UTC).minusDays(1)
    );
    setField(userAccount, "id", 101L);
    return userAccount;
  }

  private RoleEntity createRole(String code) {
    try {
      Constructor<RoleEntity> constructor = RoleEntity.class.getDeclaredConstructor();
      constructor.setAccessible(true);
      RoleEntity role = constructor.newInstance();
      setField(role, "id", 1L);
      setField(role, "code", code);
      setField(role, "name", "Khach hang");
      return role;
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException("Khong the chuan bi vai tro kiem thu.", exception);
    }
  }

  private void setField(Object target, String fieldName, Object value) {
    try {
      java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException("Khong the chuan bi du lieu kiem thu.", exception);
    }
  }
}
