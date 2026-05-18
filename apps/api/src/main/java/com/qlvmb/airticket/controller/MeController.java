package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.ChangePasswordRequest;
import com.qlvmb.airticket.domain.dto.MyLoyaltyResponse;
import com.qlvmb.airticket.domain.dto.MyPassengerResponse;
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.domain.dto.MyVoucherResponse;
import com.qlvmb.airticket.domain.dto.UpdateMyProfileRequest;
import com.qlvmb.airticket.domain.dto.UpsertMyPassengerRequest;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.AuthService;
import com.qlvmb.airticket.service.MemberLoyaltyService;
import com.qlvmb.airticket.service.MyAccountService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/me")
public class MeController {

  private final AuthService authService;
  private final MyAccountService myAccountService;
  private final MemberLoyaltyService memberLoyaltyService;

  public MeController(
      AuthService authService,
      MyAccountService myAccountService,
      MemberLoyaltyService memberLoyaltyService
  ) {
    this.authService = authService;
    this.myAccountService = myAccountService;
    this.memberLoyaltyService = memberLoyaltyService;
  }

  @GetMapping("/profile")
  @PreAuthorize("isAuthenticated()")
  public MyProfileResponse getMyProfile(Authentication authentication) {
    return authService.getMyProfile(requireAuthenticatedUser(authentication));
  }

  @PatchMapping("/profile")
  @PreAuthorize("isAuthenticated()")
  public MyProfileResponse updateMyProfile(
      Authentication authentication,
      @Valid @RequestBody UpdateMyProfileRequest request
  ) {
    return myAccountService.updateMyProfile(requireAuthenticatedUser(authentication), request);
  }

  @PostMapping("/change-password")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> changePassword(
      Authentication authentication,
      @Valid @RequestBody ChangePasswordRequest request
  ) {
    myAccountService.changePassword(requireAuthenticatedUser(authentication), request);
    return ResponseEntity.noContent().build();
  }

  @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("isAuthenticated()")
  public MyProfileResponse updateAvatar(
      Authentication authentication,
      @RequestPart("avatar") MultipartFile avatar
  ) {
    return myAccountService.updateAvatar(requireAuthenticatedUser(authentication), avatar);
  }

  @GetMapping("/passengers")
  @PreAuthorize("hasAuthority('" + PermissionCode.CUSTOMER_SELF_SERVICE + "')")
  public List<MyPassengerResponse> getMyPassengers(Authentication authentication) {
    return myAccountService.getMyPassengers(requireAuthenticatedUser(authentication));
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.MEMBER_LOYALTY + "')")
  @GetMapping("/loyalty")
  public MyLoyaltyResponse getMyLoyalty(Authentication authentication) {
    return memberLoyaltyService.getMyLoyalty(requireAuthenticatedUser(authentication));
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.MEMBER_LOYALTY + "')")
  @GetMapping("/vouchers")
  public List<MyVoucherResponse> getMyVouchers(Authentication authentication) {
    return memberLoyaltyService.getMyVouchers(requireAuthenticatedUser(authentication));
  }

  @DeleteMapping("/vouchers/{voucherCode}/history")
  @PreAuthorize("hasAuthority('" + PermissionCode.MEMBER_LOYALTY + "')")
  public ResponseEntity<Void> hideMyVoucherHistory(
      Authentication authentication,
      @PathVariable String voucherCode
  ) {
    memberLoyaltyService.hideMyUsedVoucherHistory(requireAuthenticatedUser(authentication), voucherCode);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/passengers")
  @PreAuthorize("hasAuthority('" + PermissionCode.CUSTOMER_SELF_SERVICE + "')")
  public ResponseEntity<MyPassengerResponse> createMyPassenger(
      Authentication authentication,
      @Valid @RequestBody UpsertMyPassengerRequest request
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(myAccountService.createMyPassenger(requireAuthenticatedUser(authentication), request));
  }

  @PatchMapping("/passengers/{passengerId}")
  @PreAuthorize("hasAuthority('" + PermissionCode.CUSTOMER_SELF_SERVICE + "')")
  public MyPassengerResponse updateMyPassenger(
      Authentication authentication,
      @PathVariable Long passengerId,
      @Valid @RequestBody UpsertMyPassengerRequest request
  ) {
    return myAccountService.updateMyPassenger(requireAuthenticatedUser(authentication), passengerId, request);
  }

  @DeleteMapping("/passengers/{passengerId}")
  @PreAuthorize("hasAuthority('" + PermissionCode.CUSTOMER_SELF_SERVICE + "')")
  public ResponseEntity<Void> deleteMyPassenger(
      Authentication authentication,
      @PathVariable Long passengerId
  ) {
    myAccountService.deleteMyPassenger(requireAuthenticatedUser(authentication), passengerId);
    return ResponseEntity.noContent().build();
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
