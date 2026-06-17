"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PasswordChecklist } from "@/components/password-checklist";
import { PasswordField } from "@/components/password-field";
import { SectionHeading } from "@/components/section-heading";
import {
  getAllowedBackofficeModulesByPermissions,
  ROLE_LABELS,
  type BackofficeModuleKey
} from "@/lib/access-control";
import { getApiBaseUrl } from "@/lib/api-client";
import {
  clearStoredAuthSession,
  loadActiveAuthSession,
  persistAuthSession,
  type AuthSession
} from "@/lib/auth-session";
import { formatDate } from "@/lib/format";
import {
  changeMyPassword,
  createMyPassenger,
  deleteMyVoucherHistory,
  deleteMyPassenger,
  fetchMyLoyalty,
  fetchMyNotifications,
  fetchMyPassengers,
  fetchMyProfile,
  fetchMyVouchers,
  MyAccountApiError,
  type MyLoyalty,
  type MyNotification,
  uploadMyAvatar,
  updateMyPassenger,
  updateMyProfile,
  type MyPassenger,
  type MyProfile,
  type MyVoucher,
  type UpdateMyProfilePayload,
  type UpsertMyPassengerPayload
} from "@/lib/my-account-api";
import { pushToast } from "@/lib/toast";

const EMPTY_PROFILE_FORM: UpdateMyProfilePayload = {
  displayName: "",
  phone: ""
};

const EMPTY_PASSENGER_FORM: UpsertMyPassengerPayload = {
  fullName: "",
  passengerType: "adult",
  dateOfBirth: "",
  documentType: "CCCD",
  documentNumber: "",
  isPrimary: false
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

const STAFF_ROLE_CODES = ["customer_support", "operations_staff"] as const;
const PASSENGER_SELF_SERVICE_ROLES = ["customer", "member"] as const;

const BACKOFFICE_MODULE_LABELS: Record<BackofficeModuleKey, string> = {
  sales: "Tra cứu đặt chỗ",
  support: "Hỗ trợ sau bán",
  finance: "Tài chính và hoàn tiền",
  cms: "Nội dung công khai",
  operations: "Điều hành chuyến bay và voucher",
  revenue: "Quản lý doanh thu",
  admin: "Quản trị hệ thống"
};

const BACKOFFICE_MODULE_DESCRIPTIONS: Record<BackofficeModuleKey, string> = {
  sales: "Rà soát hồ sơ đặt chỗ, trạng thái thanh toán và lịch sử xử lý.",
  support: "Theo dõi email vé, hỗ trợ sau bán và các trường hợp cần phản hồi nhanh.",
  finance: "Kiểm tra yêu cầu hoàn tiền và phối hợp xử lý các giao dịch liên quan.",
  cms: "Cập nhật nội dung công khai, câu hỏi thường gặp và thông tin hỗ trợ.",
  operations: "Cập nhật trạng thái chuyến bay, xử lý vận hành và quản lý voucher hội viên.",
  revenue: "Theo dõi doanh thu thực, số vé bán, số vé hoàn và biến động theo thời gian.",
  admin: "Quản lý tài khoản, vai trò, trạng thái và nhật ký thay đổi hệ thống."
};

function hasAnyRole(roles: string[], targetRoles: readonly string[]) {
  return targetRoles.some((targetRole) => roles.includes(targetRole));
}

function getPassengerTypeLabel(passengerType: string) {
  if (passengerType === "adult") {
    return "Người lớn";
  }

  if (passengerType === "child") {
    return "Trẻ em";
  }

  if (passengerType === "infant") {
    return "Em bé";
  }

  return passengerType;
}

function formatPassengerDate(dateOfBirth: string) {
  return formatDate(dateOfBirth, dateOfBirth);
}

function buildPassengerMeta(passenger: MyPassenger) {
  return `${getPassengerTypeLabel(passenger.passengerType)} · ${passenger.documentType} ${passenger.documentNumber}`;
}

function buildPassengerNote(passenger: MyPassenger) {
  const birthdaySummary = `Ngày sinh ${formatPassengerDate(passenger.dateOfBirth)}`;

  if (passenger.isPrimary) {
    return `${birthdaySummary} · Hồ sơ hành khách chính`;
  }

  return birthdaySummary;
}

function buildFallbackProfile(authSession: AuthSession | null): MyProfile | null {
  const sessionUser = authSession?.user;

  if (!sessionUser) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    displayName: sessionUser.displayName,
    phone: sessionUser.phone,
    avatarUrl: sessionUser.avatarUrl,
    emailVerified: sessionUser.emailVerified,
    status: "local_session",
    roles: sessionUser.roles
  };
}

function resolveAvatarUrl(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl;
  }

  return `${getApiBaseUrl()}${avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`}`;
}

function sortPassengers(passengers: MyPassenger[]) {
  return [...passengers].sort((leftPassenger, rightPassenger) => {
    if (leftPassenger.isPrimary !== rightPassenger.isPrimary) {
      return leftPassenger.isPrimary ? -1 : 1;
    }

    return leftPassenger.fullName.localeCompare(rightPassenger.fullName, "vi");
  });
}

function buildPassengerForm(passenger: MyPassenger | null): UpsertMyPassengerPayload {
  if (!passenger) {
    return EMPTY_PASSENGER_FORM;
  }

  return {
    fullName: passenger.fullName,
    passengerType: passenger.passengerType,
    dateOfBirth: passenger.dateOfBirth,
    documentType: passenger.documentType,
    documentNumber: passenger.documentNumber,
    isPrimary: passenger.isPrimary
  };
}

function buildProfileForm(profile: MyProfile | null): UpdateMyProfilePayload {
  if (!profile) {
    return EMPTY_PROFILE_FORM;
  }

  return {
    displayName: profile.displayName,
    phone: profile.phone ?? ""
  };
}

function formatRoleSummary(roles: string[]) {
  if (roles.length === 0) {
    return "Khách hàng";
  }

  return roles.map((role) => ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role).join(", ");
}

function formatPoints(pointValue: number) {
  return new Intl.NumberFormat("vi-VN").format(pointValue);
}

function formatVoucherAmount(amount: number, currency: string) {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }).format(amount);
  }

  return `${formatPoints(amount)} ${currency}`;
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

function formatVoucherStatus(status: string) {
  if (status === "AVAILABLE") {
    return "Sẵn sàng sử dụng";
  }

  if (status === "RESERVED") {
    return "Đang giữ cho booking";
  }

  if (status === "USED") {
    return "Đã sử dụng";
  }

  if (status === "EXPIRED") {
    return "Đã hết hạn";
  }

  return status;
}

function formatNotificationStatus(status: string) {
  if (status === "SENT") {
    return "Đã gửi";
  }

  if (status === "PENDING") {
    return "Đang chuẩn bị";
  }

  if (status === "FAILED") {
    return "Cần gửi lại";
  }

  return status;
}

function formatNotificationMeta(notification: MyNotification) {
  const sentTime = formatDateTime(notification.sentAt ?? notification.createdAt);

  if (notification.bookingCode) {
    return `${sentTime} · Mã đặt chỗ ${notification.bookingCode}`;
  }

  return sentTime;
}

function resolveAccountError(error: unknown, fallbackMessage: string) {
  if (error instanceof MyAccountApiError) {
    const firstFieldError = Object.values(error.errors)[0];
    return firstFieldError ?? error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

export default function AccountPage() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<MyProfile | null>(null);
  const [memberLoyalty, setMemberLoyalty] = useState<MyLoyalty | null>(null);
  const [memberVouchers, setMemberVouchers] = useState<MyVoucher[]>([]);
  const [myNotifications, setMyNotifications] = useState<MyNotification[]>([]);
  const [profileForm, setProfileForm] = useState<UpdateMyProfilePayload>(EMPTY_PROFILE_FORM);
  const [passengers, setPassengers] = useState<MyPassenger[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [profileActionError, setProfileActionError] = useState<string | null>(null);
  const [profileActionSuccess, setProfileActionSuccess] = useState<string | null>(null);
  const [passengerError, setPassengerError] = useState<string | null>(null);
  const [passengerForm, setPassengerForm] = useState<UpsertMyPassengerPayload>(EMPTY_PASSENGER_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [isProfileFormVisible, setIsProfileFormVisible] = useState(false);
  const [isAvatarFormVisible, setIsAvatarFormVisible] = useState(false);
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false);
  const [isPassengerFormVisible, setIsPassengerFormVisible] = useState(false);
  const [editingPassengerId, setEditingPassengerId] = useState<number | null>(null);
  const [passengerActionError, setPassengerActionError] = useState<string | null>(null);
  const [passengerActionSuccess, setPassengerActionSuccess] = useState<string | null>(null);
  const [passwordActionError, setPasswordActionError] = useState<string | null>(null);
  const [passwordActionSuccess, setPasswordActionSuccess] = useState<string | null>(null);
  const [avatarActionError, setAvatarActionError] = useState<string | null>(null);
  const [avatarActionSuccess, setAvatarActionSuccess] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassengers, setIsLoadingPassengers] = useState(false);
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassenger, setIsSubmittingPassenger] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [deletingPassengerId, setDeletingPassengerId] = useState<number | null>(null);
  const [hidingVoucherCode, setHidingVoucherCode] = useState<string | null>(null);

  useEffect(() => {
    setAuthSession(loadActiveAuthSession());
    setHasLoadedSession(true);
  }, []);

  useEffect(() => {
    if (!authSession?.accessToken) {
      setCustomerProfile(null);
      setMemberLoyalty(null);
      setMemberVouchers([]);
      setMyNotifications([]);
      setProfileForm(EMPTY_PROFILE_FORM);
      setPassengers([]);
      setProfileError(null);
      setLoyaltyError(null);
      setNotificationError(null);
      setProfileActionError(null);
      setProfileActionSuccess(null);
      setPassengerError(null);
      setPassengerActionError(null);
      setPassengerActionSuccess(null);
      setPasswordActionError(null);
      setPasswordActionSuccess(null);
      setAvatarActionError(null);
      setAvatarActionSuccess(null);
      setEditingPassengerId(null);
      setPassengerForm(EMPTY_PASSENGER_FORM);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setIsProfileFormVisible(false);
      setIsAvatarFormVisible(false);
      setIsPasswordFormVisible(false);
      setIsPassengerFormVisible(false);
      setIsLoadingProfile(false);
      setIsLoadingPassengers(false);
      setIsLoadingLoyalty(false);
      setIsLoadingNotifications(false);
      setHidingVoucherCode(null);
      return;
    }

    const accessToken = authSession.accessToken;
    const sessionRoles = authSession.user.roles;
    let isCancelled = false;

    async function loadCustomerData() {
      setIsLoadingProfile(true);
      setIsLoadingPassengers(false);
      setIsLoadingLoyalty(false);
      setIsLoadingNotifications(!hasAnyRole(sessionRoles, STAFF_ROLE_CODES));
      setMyNotifications([]);
      setProfileError(null);
      setPassengerError(null);
      setLoyaltyError(null);
      setNotificationError(null);

      try {
        const nextCustomerProfile = await fetchMyProfile(accessToken);

        if (!isCancelled) {
          setCustomerProfile(nextCustomerProfile);
          setProfileForm(buildProfileForm(nextCustomerProfile));
        }

        if (hasAnyRole(nextCustomerProfile.roles, STAFF_ROLE_CODES)) {
          if (!isCancelled) {
            setMyNotifications([]);
            setNotificationError(null);
            setIsLoadingNotifications(false);
          }
        } else {
          setIsLoadingNotifications(true);

          try {
            const nextNotifications = await fetchMyNotifications(accessToken);

            if (!isCancelled) {
              setMyNotifications(nextNotifications);
            }
          } catch (error) {
            if (!isCancelled) {
              setMyNotifications([]);
              setNotificationError(
                resolveAccountError(error, "Không thể tải thông báo cá nhân lúc này.")
              );
            }
          } finally {
            if (!isCancelled) {
              setIsLoadingNotifications(false);
            }
          }
        }

        if (hasAnyRole(nextCustomerProfile.roles, PASSENGER_SELF_SERVICE_ROLES)) {
          setIsLoadingPassengers(true);

          try {
            const nextPassengers = await fetchMyPassengers(accessToken);

            if (!isCancelled) {
              setPassengers(sortPassengers(nextPassengers));
            }
          } catch (error) {
            if (!isCancelled) {
              setPassengers([]);
              setPassengerError(
                resolveAccountError(error, "Không thể tải danh sách hành khách lúc này.")
              );
            }
          } finally {
            if (!isCancelled) {
              setIsLoadingPassengers(false);
            }
          }
        } else if (!isCancelled) {
          setPassengers([]);
          setPassengerError(null);
          setPassengerForm(EMPTY_PASSENGER_FORM);
          setEditingPassengerId(null);
        }

        if (nextCustomerProfile.roles.includes("member")) {
          setIsLoadingLoyalty(true);

          try {
            const [nextLoyalty, nextVouchers] = await Promise.all([
              fetchMyLoyalty(accessToken),
              fetchMyVouchers(accessToken)
            ]);

            if (!isCancelled) {
              setMemberLoyalty(nextLoyalty);
              setMemberVouchers(nextVouchers);
            }
          } catch (error) {
            if (!isCancelled) {
              setMemberLoyalty(null);
              setMemberVouchers([]);
              setLoyaltyError(
                resolveAccountError(error, "Không thể tải dữ liệu hội viên lúc này.")
              );
            }
          } finally {
            if (!isCancelled) {
              setIsLoadingLoyalty(false);
            }
          }
        } else if (!isCancelled) {
          setMemberLoyalty(null);
          setMemberVouchers([]);
          setLoyaltyError(null);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message = resolveAccountError(
          error,
          "Không thể tải dữ liệu tài khoản lúc này."
        );
        setProfileError(message);
        setPassengerError(message);
        setNotificationError(message);
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
          setIsLoadingNotifications(false);
        }
      }
    }

    void loadCustomerData();

    return () => {
      isCancelled = true;
    };
  }, [authSession]);

  const activeProfile = customerProfile ?? buildFallbackProfile(authSession);
  const activeRoles = activeProfile?.roles ?? authSession?.user.roles ?? [];
  const activePermissions = authSession?.user.permissions ?? [];
  const phoneSummary = activeProfile?.phone?.trim() ? activeProfile.phone : "Chưa cập nhật";
  const avatarUrl = resolveAvatarUrl(activeProfile?.avatarUrl);
  const localizedRoleSummary = activeProfile ? formatRoleSummary(activeRoles) : "Khách hàng";
  const isMemberProfile = activeRoles.includes("member");
  const isStaffProfile = hasAnyRole(activeRoles, STAFF_ROLE_CODES);
  const isOperationsStaffProfile = hasAnyRole(activeRoles, ["operations_staff"]);
  const canUsePassengerSelfService = hasAnyRole(activeRoles, PASSENGER_SELF_SERVICE_ROLES);
  const allowedBackofficeModules = getAllowedBackofficeModulesByPermissions(activePermissions);
  const loyaltyStats = memberLoyalty
    ? [
        {
          label: "Hạng hội viên",
          value: memberLoyalty.membershipTier
        },
        {
          label: "Điểm hiện có",
          value: `${formatPoints(memberLoyalty.pointBalance)} điểm`
        },
        {
          label: "Voucher sẵn sàng",
          value: `${memberLoyalty.availableVoucherCount} ưu đãi`
        }
      ]
    : [
        {
          label: "Hạng hội viên",
          value: "Chưa có dữ liệu"
        },
        {
          label: "Điểm hiện có",
          value: "0 điểm"
        },
        {
          label: "Voucher sẵn sàng",
          value: "0 ưu đãi"
        }
      ];
  const passwordBlockedFragments = [
    activeProfile?.displayName ?? "",
    activeProfile?.email ?? "",
    activeProfile?.phone ?? ""
  ];
  const isPasswordFormValid =
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length > 0 &&
    passwordForm.confirmPassword === passwordForm.newPassword;
  const isEditingPassenger = editingPassengerId !== null;
  const activityFeed = activeProfile
    ? isStaffProfile
      ? [
          {
            title: "Hồ sơ cá nhân",
            time: isLoadingProfile ? "Đang tải" : "Đã sẵn sàng",
            summary: `Email đăng nhập: ${activeProfile.email}. Số điện thoại: ${phoneSummary}.`
          },
          {
            title: "Phạm vi công việc",
            time: "Theo vai trò hiện tại",
            summary: `Bạn đang dùng quyền ${localizedRoleSummary.toLowerCase()} với ${allowedBackofficeModules.length} khu vực backoffice khả dụng.`
          },
          {
            title: "Lối tắt xử lý",
            time: "Truy cập nhanh",
            summary: allowedBackofficeModules.length
              ? `Có thể mở nhanh: ${allowedBackofficeModules.map((module) => BACKOFFICE_MODULE_LABELS[module]).join(", ")}.`
              : "Không có module backoffice nào khả dụng trong phiên hiện tại."
          }
        ]
      : [
          {
            title: "Hồ sơ tài khoản",
            time: isLoadingProfile ? "Đang tải" : "Đã sẵn sàng",
            summary: `Email đăng nhập: ${activeProfile.email}. Số điện thoại: ${phoneSummary}.`
          },
          {
            title: "Danh sách hành khách",
            time: isLoadingPassengers ? "Đang cập nhật" : "Đã cập nhật",
            summary: `Đã lưu ${passengers.length} hành khách thường dùng.`
          },
          {
            title: "Quyền truy cập",
            time: "Theo role hiện tại",
            summary: `Vai trò đang dùng: ${localizedRoleSummary}.`
          }
        ]
    : [
        {
          title: "Chưa đăng nhập",
          time: "Yêu cầu đăng nhập",
          summary: "Đăng nhập để xem hồ sơ tài khoản và danh sách hành khách thường dùng."
        }
      ];
  const heroEyebrow = activeProfile
    ? isStaffProfile
      ? localizedRoleSummary
      : activeProfile.displayName
    : "Tài khoản";
  const heroTitle = activeProfile
    ? isOperationsStaffProfile
      ? "Hồ sơ nội bộ"
      : isStaffProfile
        ? "Hồ sơ và lối tắt công việc"
        : "Tài khoản của tôi"
    : "Đăng nhập để quản lý tài khoản";
  const heroDescription = activeProfile
    ? isOperationsStaffProfile
      ? "Cập nhật thông tin cá nhân và mở nhanh các module vận hành được cấp quyền."
      : isStaffProfile
        ? "Kiểm tra hồ sơ, vai trò và các khu vực backoffice có thể xử lý trong phiên hiện tại."
        : "Cập nhật hồ sơ, hành khách thường dùng, voucher và thông báo chuyến bay."
    : "Đăng nhập để lưu hồ sơ, hành khách thường dùng và theo dõi cập nhật chuyến bay.";
  const accountPills = activeProfile
    ? [
        activeProfile.email,
        activeProfile.emailVerified ? "Email đã xác minh" : "Email chưa xác minh",
        `Vai trò: ${localizedRoleSummary}`,
        `Số điện thoại: ${phoneSummary}`,
        isStaffProfile
          ? `${allowedBackofficeModules.length} module backoffice`
          : isLoadingProfile
            ? "Đang tải hồ sơ"
            : "Hồ sơ sẵn sàng"
      ]
    : [];

  function handleProfileFieldChange<Key extends keyof UpdateMyProfilePayload>(
    fieldName: Key,
    value: UpdateMyProfilePayload[Key]
  ) {
    setProfileForm((currentProfileForm) => ({
      ...currentProfileForm,
      [fieldName]: value
    }));
  }

  function handlePassengerFieldChange<Key extends keyof UpsertMyPassengerPayload>(
    fieldName: Key,
    value: UpsertMyPassengerPayload[Key]
  ) {
    setPassengerForm((currentPassengerForm) => ({
      ...currentPassengerForm,
      [fieldName]: value
    }));
  }

  function resetPassengerForm() {
    setPassengerForm(EMPTY_PASSENGER_FORM);
    setEditingPassengerId(null);
    setPassengerActionError(null);
    setPassengerActionSuccess(null);
    setIsPassengerFormVisible(false);
  }

  function resetProfileForm() {
    setProfileForm(buildProfileForm(activeProfile));
    setProfileActionError(null);
    setProfileActionSuccess(null);
    setIsProfileFormVisible(false);
  }

  function syncProfile(nextProfile: MyProfile) {
    setCustomerProfile(nextProfile);
    setProfileForm(buildProfileForm(nextProfile));

    if (!authSession) {
      return;
    }

    const nextAuthSession: AuthSession = {
      ...authSession,
      user: {
        ...authSession.user,
        displayName: nextProfile.displayName,
        phone: nextProfile.phone,
        avatarUrl: nextProfile.avatarUrl,
        emailVerified: nextProfile.emailVerified,
        roles: nextProfile.roles
      }
    };
    persistAuthSession(nextAuthSession);
    setAuthSession(nextAuthSession);
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authSession?.accessToken || isSubmittingProfile) {
      return;
    }

    setIsSubmittingProfile(true);
    setProfileActionError(null);
    setProfileActionSuccess(null);

    const payload: UpdateMyProfilePayload = {
      displayName: profileForm.displayName.trim(),
      phone: profileForm.phone.trim()
    };

    try {
      const nextProfile = await updateMyProfile(authSession.accessToken, payload);
      syncProfile(nextProfile);
      setProfileError(null);
      setProfileActionSuccess("Đã cập nhật hồ sơ tài khoản.");
      setIsProfileFormVisible(false);
    } catch (error) {
      setProfileActionError(
        resolveAccountError(error, "Không thể lưu hồ sơ tài khoản lúc này.")
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const avatar = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!avatar || !authSession?.accessToken || isUploadingAvatar) {
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarActionError(null);
    setAvatarActionSuccess(null);

    try {
      const nextProfile = await uploadMyAvatar(authSession.accessToken, avatar);
      syncProfile(nextProfile);
      setAvatarActionSuccess("Đã cập nhật ảnh đại diện.");
      setIsAvatarFormVisible(false);
    } catch (error) {
      setAvatarActionError(
        resolveAccountError(error, "Không thể cập nhật ảnh đại diện lúc này.")
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function handlePasswordFieldChange(fieldName: keyof typeof EMPTY_PASSWORD_FORM, value: string) {
    setPasswordForm((currentPasswordForm) => ({
      ...currentPasswordForm,
      [fieldName]: value
    }));
  }

  function togglePasswordForm() {
    setIsPasswordFormVisible((currentIsPasswordFormVisible) => {
      const nextIsPasswordFormVisible = !currentIsPasswordFormVisible;

      if (!nextIsPasswordFormVisible) {
        setPasswordForm(EMPTY_PASSWORD_FORM);
        setPasswordActionError(null);
        setPasswordActionSuccess(null);
      }

      return nextIsPasswordFormVisible;
    });
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authSession?.accessToken || isSubmittingPassword) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordActionError("Mật khẩu nhập lại chưa trùng khớp.");
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordActionError(null);
    setPasswordActionSuccess(null);

    try {
      await changeMyPassword(authSession.accessToken, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordActionSuccess("Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.");
      clearStoredAuthSession();
      setAuthSession(null);
      window.location.assign("/login");
    } catch (error) {
      setPasswordActionError(
        resolveAccountError(error, "Không thể đổi mật khẩu lúc này.")
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  async function handlePassengerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authSession?.accessToken || isSubmittingPassenger) {
      return;
    }

    setIsSubmittingPassenger(true);
    setPassengerActionError(null);
    setPassengerActionSuccess(null);

    const payload: UpsertMyPassengerPayload = {
      fullName: passengerForm.fullName.trim(),
      passengerType: passengerForm.passengerType,
      dateOfBirth: passengerForm.dateOfBirth,
      documentType: passengerForm.documentType.trim(),
      documentNumber: passengerForm.documentNumber.trim(),
      isPrimary: passengerForm.isPrimary
    };

    try {
      const savedPassenger = editingPassengerId === null
        ? await createMyPassenger(authSession.accessToken, payload)
        : await updateMyPassenger(authSession.accessToken, editingPassengerId, payload);

      setPassengers((currentPassengers) => {
        const passengersWithoutEditedOne = currentPassengers.filter(
          (passenger) => passenger.id !== savedPassenger.id
        );
        return sortPassengers([...passengersWithoutEditedOne, savedPassenger]);
      });
      setPassengerError(null);
      setPassengerActionSuccess(
        editingPassengerId === null
          ? "Đã thêm hành khách thường dùng."
          : "Đã cập nhật hành khách thường dùng."
      );
      setPassengerForm(EMPTY_PASSENGER_FORM);
      setEditingPassengerId(null);
      setIsPassengerFormVisible(false);
    } catch (error) {
      setPassengerActionError(
        resolveAccountError(error, "Không thể lưu hành khách lúc này.")
      );
    } finally {
      setIsSubmittingPassenger(false);
    }
  }

  function handleEditPassenger(passenger: MyPassenger) {
    setPassengerForm(buildPassengerForm(passenger));
    setEditingPassengerId(passenger.id);
    setPassengerActionError(null);
    setPassengerActionSuccess(null);
    setIsPassengerFormVisible(true);
  }

  async function handleDeletePassenger(passenger: MyPassenger) {
    if (!authSession?.accessToken || deletingPassengerId !== null) {
      return;
    }

    const shouldDeletePassenger = window.confirm(
      `Bạn có chắc muốn xóa hành khách ${passenger.fullName}?`
    );

    if (!shouldDeletePassenger) {
      return;
    }

    setDeletingPassengerId(passenger.id);
    setPassengerActionError(null);
    setPassengerActionSuccess(null);

    try {
      await deleteMyPassenger(authSession.accessToken, passenger.id);
      setPassengers((currentPassengers) =>
        currentPassengers.filter((currentPassenger) => currentPassenger.id !== passenger.id)
      );

      if (editingPassengerId === passenger.id) {
        setPassengerForm(EMPTY_PASSENGER_FORM);
        setEditingPassengerId(null);
      }

      setPassengerActionSuccess("Đã xóa hành khách thường dùng.");
    } catch (error) {
      setPassengerActionError(
        resolveAccountError(error, "Không thể xóa hành khách lúc này.")
      );
    } finally {
      setDeletingPassengerId(null);
    }
  }

  async function handleHideUsedVoucher(voucher: MyVoucher) {
    if (!authSession?.accessToken || hidingVoucherCode !== null) {
      return;
    }

    const shouldHideVoucher = window.confirm(
      `Ẩn lịch sử voucher ${voucher.voucherCode} khỏi tài khoản này?`
    );

    if (!shouldHideVoucher) {
      return;
    }

    setHidingVoucherCode(voucher.voucherCode);
    setLoyaltyError(null);

    try {
      await deleteMyVoucherHistory(authSession.accessToken, voucher.voucherCode);
      setMemberVouchers((currentVouchers) =>
        currentVouchers.filter((currentVoucher) => currentVoucher.voucherCode !== voucher.voucherCode)
      );
      pushToast({
        title: "Đã ẩn lịch sử voucher",
        message: "Voucher đã dùng đã được ẩn khỏi tài khoản hội viên.",
        tone: "success"
      });
    } catch (error) {
      const message = resolveAccountError(error, "Không thể ẩn lịch sử voucher lúc này.");
      setLoyaltyError(message);
      pushToast({
        title: "Không thể xử lý yêu cầu",
        message,
        tone: "warning"
      });
    } finally {
      setHidingVoucherCode(null);
    }
  }

  const notificationSection = (
    <>
      <div id="thong-bao" className="account-anchor" aria-hidden="true" />
      <SectionHeading
        eyebrow={isStaffProfile ? "Công việc" : "Thông báo"}
        title={
          isStaffProfile
            ? "Tóm tắt phiên làm việc"
            : "Thông báo gần đây"
        }
        description={
          isStaffProfile
            ? "Kiểm tra vai trò, hồ sơ đăng nhập và các khu vực có thể xử lý."
            : "Các cập nhật về vé, chuyến bay và phản hồi hỗ trợ được gom tại đây."
        }
      />
      <div className="stack-list">
        {isStaffProfile || !activeProfile ? (
          activityFeed.map((item) => (
            <article key={item.title} className="surface-card notification-card">
              <span className="pill">{item.time}</span>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </article>
          ))
        ) : notificationError ? (
          <article className="surface-card notification-card">
            <span className="pill">Thử lại sau</span>
            <h3>Chưa tải được thông báo</h3>
            <p>{notificationError}</p>
          </article>
        ) : isLoadingNotifications ? (
          <article className="surface-card notification-card">
            <span className="pill">Đang tải</span>
            <h3>Đang lấy thông báo cá nhân</h3>
            <p>Thông tin mới nhất sẽ xuất hiện tại đây sau khi hệ thống hoàn tất tải dữ liệu.</p>
          </article>
        ) : myNotifications.length > 0 ? (
          myNotifications.map((notification) => (
            <article key={notification.id} className="surface-card notification-card">
              <span className="pill">{formatNotificationStatus(notification.status)}</span>
              <h3>{notification.subject}</h3>
              <p>{notification.body}</p>
              <small>{formatNotificationMeta(notification)}</small>
            </article>
          ))
        ) : (
          <article className="surface-card notification-card">
            <span className="pill">0 thông báo</span>
            <h3>Chưa có thông báo cá nhân</h3>
            <p>Các cập nhật về vé, chuyến bay hoặc phản hồi hỗ trợ sẽ xuất hiện tại đây.</p>
          </article>
        )}
      </div>
    </>
  );

  const staffShortcutSection = (
    <>
      <SectionHeading
        eyebrow="Backoffice"
        title="Lối tắt nội bộ"
        description="Mở nhanh các khu vực được cấp quyền trong phiên hiện tại."
      />
      <div className="card-grid staff-shortcut-grid">
        {allowedBackofficeModules.length > 0 ? (
          allowedBackofficeModules.map((module) => (
            <article key={module} className="surface-card action-card">
              <div className="auth-note-head">
                <h3>{BACKOFFICE_MODULE_LABELS[module]}</h3>
                <span className="pill">Sẵn sàng</span>
              </div>
              <p>{BACKOFFICE_MODULE_DESCRIPTIONS[module]}</p>
              <div className="auth-action-row">
                <Link href={`/backoffice/${module}`} prefetch={false} className="button button-primary">
                  Mở khu vực
                </Link>
              </div>
            </article>
          ))
        ) : (
          <article className="surface-card action-card">
            <div className="auth-note-head">
              <h3>Chưa có khu vực nào được cấp</h3>
              <span className="pill">Cần kiểm tra lại quyền</span>
            </div>
            <p>
              Phiên hiện tại chưa có module backoffice khả dụng. Hãy đăng xuất và đăng
              nhập lại sau khi quản trị viên cập nhật quyền.
            </p>
          </article>
        )}
      </div>
    </>
  );

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card account-dashboard-hero">
          <div>
            <span className="section-eyebrow">{heroEyebrow}</span>
            <h1 className="page-title">{heroTitle}</h1>
            <p className="page-hero-copy">{heroDescription}</p>
            {accountPills.length > 0 ? (
              <div className="role-chip-cloud account-pill-cloud">
                {accountPills.map((pill) => (
                  <span key={pill} className="pill">
                    {pill}
                  </span>
                ))}
              </div>
            ) : null}
            {profileError && activeProfile ? (
              <div className="auth-note-card">
                <div className="auth-note-head">
                  <h3>Chưa tải được hồ sơ mới nhất</h3>
                  <span className="pill">Đang hiển thị thông tin hiện có</span>
                </div>
                <p>{profileError}</p>
              </div>
            ) : null}
            {hasLoadedSession && !activeProfile ? (
              <div className="auth-note-card">
                <div className="auth-note-head">
                  <h3>Bạn chưa đăng nhập trên thiết bị này</h3>
                  <span className="pill">Có thể đăng nhập bất cứ lúc nào</span>
                </div>
                <p>
                  Bạn vẫn có thể xem thông tin chuyến bay trên website, nhưng cần đăng nhập
                  để lưu hồ sơ hành khách và tiếp tục theo dõi tài khoản trên trình duyệt này.
                </p>
                <div className="auth-action-row">
                  <Link href="/login" className="button button-primary">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="button button-secondary">
                    Tạo tài khoản
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
          <aside className="account-overview-card" aria-label="Tổng quan tài khoản">
            <div className="account-overview-head">
              <div className="profile-avatar-preview account-overview-avatar">
                <img
                  src={avatarUrl ?? "/images/default-avatar.svg"}
                  alt={`Ảnh đại diện của ${activeProfile?.displayName ?? "tài khoản"}`}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/images/default-avatar.svg";
                  }}
                />
              </div>
              <div>
                <span className="pill">{isStaffProfile ? "Nội bộ" : "Hành khách"}</span>
                <h2>{activeProfile?.displayName ?? "Chưa đăng nhập"}</h2>
                <p>{activeProfile?.email ?? "Đăng nhập để xem hồ sơ cá nhân."}</p>
              </div>
            </div>
            <div className="account-overview-list">
              <div>
                <span>Email</span>
                <strong>{activeProfile?.email ?? "Chưa đăng nhập"}</strong>
              </div>
              <div>
                <span>Xác minh</span>
                <strong>{activeProfile?.emailVerified ? "Email đã xác minh" : "Email chưa xác minh"}</strong>
              </div>
              <div>
                <span>Vai trò</span>
                <strong>{localizedRoleSummary}</strong>
              </div>
              <div>
                <span>Số điện thoại</span>
                <strong>{phoneSummary}</strong>
              </div>
              <div>
                <span>Trạng thái hồ sơ</span>
                <strong>
                  {isLoadingProfile ? "Đang tải" : activeProfile ? "Sẵn sàng" : "Cần đăng nhập"}
                </strong>
              </div>
              <div>
                <span>{isStaffProfile ? "Module nội bộ" : "Hành khách"}</span>
                <strong>
                  {isStaffProfile
                    ? `${allowedBackofficeModules.length} khu vực`
                    : `${passengers.length} hồ sơ`}
                </strong>
              </div>
            </div>
            {activeProfile ? (
              <div className="account-overview-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsProfileFormVisible((value) => !value)}
                  aria-expanded={isProfileFormVisible}
                >
                  Cập nhật hồ sơ
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsAvatarFormVisible((value) => !value)}
                  aria-expanded={isAvatarFormVisible}
                >
                  Đổi ảnh
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsPasswordFormVisible(true)}
                  aria-expanded={isPasswordFormVisible}
                >
                  Đổi mật khẩu
                </button>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="section-gap" />
        <div className="section-split account-dashboard-grid">
          <div>
            {activeProfile && isAvatarFormVisible ? (
              <div className="account-modal-backdrop" role="presentation">
                <div
                  className="surface-card account-modal-card"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="account-avatar-title"
                >
                <div className="auth-note-head">
                  <div>
                    <h3 id="account-avatar-title">Đổi ảnh đại diện</h3>
                    <span className="pill">JPG, PNG hoặc WEBP, tối đa 2 MB</span>
                  </div>
                  <button
                    type="button"
                    className="profile-password-close"
                    onClick={() => setIsAvatarFormVisible(false)}
                    aria-label="Đóng form đổi ảnh đại diện"
                  >
                    ×
                  </button>
                </div>
                <div className="profile-avatar-row">
                  <div className="profile-avatar-preview">
                    <img
                      src={avatarUrl ?? "/images/default-avatar.svg"}
                      alt={`Ảnh đại diện của ${activeProfile.displayName}`}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/images/default-avatar.svg";
                      }}
                    />
                  </div>
                  <div className="profile-avatar-actions">
                    <strong>Ảnh đại diện hiện tại</strong>
                    <p>Chọn tệp mới để cập nhật ảnh hiển thị trong tài khoản và panel người dùng.</p>
                    <div className="auth-action-row profile-avatar-button-row">
                      <label className="button button-primary">
                        {isUploadingAvatar ? "Đang tải ảnh..." : "Chọn ảnh mới"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatarChange}
                          disabled={isUploadingAvatar}
                          hidden
                        />
                      </label>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setIsAvatarFormVisible(false)}
                        disabled={isUploadingAvatar}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
                {avatarActionError ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Không thể cập nhật ảnh đại diện</h3>
                      <span className="pill">Cần kiểm tra lại</span>
                    </div>
                    <p>{avatarActionError}</p>
                  </div>
                ) : null}
                {avatarActionSuccess ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Đã cập nhật ảnh đại diện</h3>
                      <span className="pill">Đã lưu</span>
                    </div>
                    <p>{avatarActionSuccess}</p>
                  </div>
                ) : null}
                </div>
              </div>
            ) : null}
            {activeProfile && isProfileFormVisible ? (
              <div className="account-modal-backdrop" role="presentation">
              <form
                className="surface-card account-modal-card"
                onSubmit={handleProfileSubmit}
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-profile-title"
              >
                <div className="auth-note-head">
                  <div>
                    <h3 id="account-profile-title">Cập nhật hồ sơ tài khoản</h3>
                    <span className="pill auth-sync-pill">Đồng bộ hồ sơ</span>
                  </div>
                  <button
                    type="button"
                    className="profile-password-close"
                    onClick={() => setIsProfileFormVisible(false)}
                    aria-label="Đóng form cập nhật hồ sơ"
                  >
                    ×
                  </button>
                </div>
                <div className="auth-field-grid auth-field-grid-double">
                  <label className="field auth-field">
                    <span>Tên hiển thị</span>
                    <input
                      value={profileForm.displayName}
                      onChange={(event) =>
                        handleProfileFieldChange("displayName", event.target.value)
                      }
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </label>
                  <label className="field auth-field">
                    <span>Số điện thoại</span>
                    <input
                      value={profileForm.phone}
                      onChange={(event) =>
                        handleProfileFieldChange("phone", event.target.value)
                      }
                      placeholder="0911222333"
                    />
                  </label>
                </div>
                {profileActionError ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Không thể lưu hồ sơ</h3>
                      <span className="pill">Cần kiểm tra lại</span>
                    </div>
                    <p>{profileActionError}</p>
                  </div>
                ) : null}
                {profileActionSuccess ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Cập nhật hồ sơ thành công</h3>
                      <span className="pill">Đã lưu</span>
                    </div>
                    <p>{profileActionSuccess}</p>
                  </div>
                ) : null}
                <div className="auth-action-row">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={isSubmittingProfile}
                  >
                    {isSubmittingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={resetProfileForm}
                    disabled={isSubmittingProfile}
                  >
                    Hủy
                  </button>
                </div>
              </form>
              </div>
            ) : null}

            {activeProfile && isPasswordFormVisible ? (
              <div className="account-modal-backdrop" role="presentation">
              <form
                className="surface-card account-modal-card profile-password-form"
                onSubmit={handlePasswordSubmit}
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-password-title"
              >
                <div className="auth-note-head profile-password-form-head">
                  <div>
                    <h3 id="account-password-title">Đổi mật khẩu</h3>
                    <span className="pill">Yêu cầu đăng nhập lại sau khi đổi</span>
                  </div>
                  <button
                    type="button"
                    className="profile-password-close"
                    onClick={togglePasswordForm}
                    aria-label="Đóng form đổi mật khẩu"
                  >
                    ×
                  </button>
                </div>
                <div className="auth-field-grid">
                  <PasswordField
                    label="Mật khẩu hiện tại"
                    placeholder="Nhập mật khẩu đang dùng"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      handlePasswordFieldChange("currentPassword", event.target.value)
                    }
                    required
                  />
                  <PasswordField
                    label="Mật khẩu mới"
                    placeholder="Tối thiểu 10 ký tự và đủ mạnh"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      handlePasswordFieldChange("newPassword", event.target.value)
                    }
                    required
                  />
                  <PasswordField
                    label="Nhập lại mật khẩu mới"
                    placeholder="Nhập lại để xác nhận"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      handlePasswordFieldChange("confirmPassword", event.target.value)
                    }
                    required
                  />
                </div>
                <PasswordChecklist
                  password={passwordForm.newPassword}
                  blockedFragments={passwordBlockedFragments}
                  confirmPassword={passwordForm.confirmPassword}
                />
                {passwordActionError ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Không thể đổi mật khẩu</h3>
                      <span className="pill">Cần kiểm tra lại</span>
                    </div>
                    <p>{passwordActionError}</p>
                  </div>
                ) : null}
                {passwordActionSuccess ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Đã đổi mật khẩu</h3>
                      <span className="pill">Đăng nhập lại</span>
                    </div>
                    <p>{passwordActionSuccess}</p>
                  </div>
                ) : null}
                <div className="auth-action-row">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={!isPasswordFormValid || isSubmittingPassword}
                  >
                    {isSubmittingPassword ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setPasswordForm(EMPTY_PASSWORD_FORM);
                      setPasswordActionError(null);
                      setPasswordActionSuccess(null);
                    }}
                    disabled={isSubmittingPassword}
                  >
                    Làm trống
                  </button>
                </div>
              </form>
              </div>
            ) : null}

            {canUsePassengerSelfService ? (
              <>
                <div className="section-gap" />
                <div id="hanh-khach" className="account-anchor" aria-hidden="true" />
                <SectionHeading
                  eyebrow="Hành khách"
                  title="Hành khách thường dùng"
                  description="Lưu hồ sơ giấy tờ để đặt vé nhanh hơn ở các chuyến tiếp theo."
                />
                {activeProfile ? (
                  <div className="account-section-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setPassengerForm(EMPTY_PASSENGER_FORM);
                        setEditingPassengerId(null);
                        setPassengerActionError(null);
                        setPassengerActionSuccess(null);
                        setIsPassengerFormVisible(true);
                      }}
                      aria-expanded={isPassengerFormVisible}
                    >
                      Thêm hành khách
                    </button>
                  </div>
                ) : null}
                {passengerError && activeProfile ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Chưa tải được danh sách hành khách</h3>
                      <span className="pill">Đang dùng dữ liệu hiện có</span>
                    </div>
                    <p>{passengerError}</p>
                  </div>
                ) : null}
                {activeProfile && isPassengerFormVisible ? (
                  <div className="account-modal-backdrop" role="presentation">
                  <form
                    className="surface-card account-modal-card"
                    onSubmit={handlePassengerSubmit}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="account-passenger-title"
                  >
                    <div className="auth-note-head">
                      <div>
                        <h3 id="account-passenger-title">
                          {isEditingPassenger
                            ? "Cập nhật hành khách thường dùng"
                            : "Thêm hành khách thường dùng"}
                        </h3>
                        <span className="pill">
                          {isEditingPassenger ? "Chế độ chỉnh sửa" : "Chế độ thêm mới"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="profile-password-close"
                        onClick={resetPassengerForm}
                        aria-label="Đóng form hành khách"
                      >
                        ×
                      </button>
                    </div>
                    <div className="auth-field-grid auth-field-grid-double">
                      <label className="field auth-field">
                        <span>Họ tên hành khách</span>
                        <input
                          value={passengerForm.fullName}
                          onChange={(event) =>
                            handlePassengerFieldChange("fullName", event.target.value)
                          }
                          placeholder="Nguyễn Văn A"
                          required
                        />
                      </label>
                      <label className="field auth-field">
                        <span>Loại hành khách</span>
                        <select
                          value={passengerForm.passengerType}
                          onChange={(event) =>
                            handlePassengerFieldChange("passengerType", event.target.value)
                          }
                        >
                          <option value="adult">Người lớn</option>
                          <option value="child">Trẻ em</option>
                          <option value="infant">Em bé</option>
                        </select>
                      </label>
                      <label className="field auth-field">
                        <span>Ngày sinh</span>
                        <input
                          type="date"
                          lang="vi"
                          value={passengerForm.dateOfBirth}
                          onChange={(event) =>
                            handlePassengerFieldChange("dateOfBirth", event.target.value)
                          }
                          required
                        />
                      </label>
                      <label className="field auth-field">
                        <span>Loại giấy tờ</span>
                        <input
                          value={passengerForm.documentType}
                          onChange={(event) =>
                            handlePassengerFieldChange("documentType", event.target.value)
                          }
                          placeholder="CCCD hoặc PASSPORT"
                          required
                        />
                      </label>
                      <label className="field auth-field">
                        <span>Số giấy tờ</span>
                        <input
                          value={passengerForm.documentNumber}
                          onChange={(event) =>
                            handlePassengerFieldChange("documentNumber", event.target.value)
                          }
                          placeholder="012345678901"
                          required
                        />
                      </label>
                    </div>
                    <div className="auth-helper-row">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={passengerForm.isPrimary}
                          onChange={(event) =>
                            handlePassengerFieldChange("isPrimary", event.target.checked)
                          }
                        />
                        <span>Đặt làm hành khách chính</span>
                      </label>
                    </div>
                    {passengerActionError ? (
                      <div className="auth-note-card">
                        <div className="auth-note-head">
                          <h3>Không thể lưu hành khách</h3>
                          <span className="pill">Cần kiểm tra lại</span>
                        </div>
                        <p>{passengerActionError}</p>
                      </div>
                    ) : null}
                    {passengerActionSuccess ? (
                      <div className="auth-note-card">
                        <div className="auth-note-head">
                          <h3>Cập nhật hành khách thành công</h3>
                          <span className="pill">Đã lưu</span>
                        </div>
                        <p>{passengerActionSuccess}</p>
                      </div>
                    ) : null}
                    <div className="auth-action-row">
                      <button
                        type="submit"
                        className="button button-primary"
                        disabled={isSubmittingPassenger}
                      >
                        {isSubmittingPassenger
                          ? "Đang lưu..."
                          : isEditingPassenger
                            ? "Lưu cập nhật"
                            : "Thêm hành khách"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={resetPassengerForm}
                        disabled={isSubmittingPassenger}
                      >
                        {isEditingPassenger ? "Hủy chỉnh sửa" : "Làm trống biểu mẫu"}
                      </button>
                    </div>
                  </form>
                  </div>
                ) : null}
                <div className="stack-list">
                  {passengers.length > 0 ? (
                    passengers.map((passenger) => (
                      <article key={passenger.id} className="surface-card traveler-card">
                        <div>
                          <h3>{passenger.fullName}</h3>
                          <small>{buildPassengerMeta(passenger)}</small>
                        </div>
                        <p>{buildPassengerNote(passenger)}</p>
                        <div className="auth-action-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => handleEditPassenger(passenger)}
                            disabled={isSubmittingPassenger || deletingPassengerId === passenger.id}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => handleDeletePassenger(passenger)}
                            disabled={deletingPassengerId === passenger.id}
                          >
                            {deletingPassengerId === passenger.id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="surface-card traveler-card">
                      <div>
                        <h3>Chưa có hành khách thường dùng</h3>
                        <small>Dữ liệu hành khách chưa sẵn sàng trên tài khoản này.</small>
                      </div>
                      <p>
                        {activeProfile
                          ? "Bạn có thể thêm hành khách đầu tiên ngay tại biểu mẫu bên trên."
                          : "Đăng nhập để xem và quản lý danh sách hành khách thường dùng của bạn."}
                      </p>
                    </article>
                  )}
                </div>
                {activeProfile ? (
                  <div className="role-chip-cloud account-pill-cloud">
                    <span className="pill">
                      {isLoadingPassengers
                        ? "Đang tải danh sách hành khách"
                        : `Đã tải ${passengers.length} hành khách`}
                    </span>
                  </div>
                ) : null}
              </>
            ) : null}
            {isMemberProfile ? (
              <>
                <div className="section-gap" />
                {notificationSection}
              </>
            ) : null}
            {isStaffProfile ? staffShortcutSection : null}
          </div>
          <div>
            {isMemberProfile ? (
              <>
                <div id="voucher" className="account-anchor" aria-hidden="true" />
                <SectionHeading
                  eyebrow="Hội viên"
                  title="Voucher và điểm thưởng"
                  description="Theo dõi điểm, voucher còn hiệu lực và lịch sử biến động gần đây."
                />
                {loyaltyError ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Chưa tải được dữ liệu hội viên</h3>
                      <span className="pill">Thử lại sau</span>
                    </div>
                    <p>{loyaltyError}</p>
                  </div>
                ) : null}
                <div className="metric-grid account-loyalty-metric-grid">
                  {loyaltyStats.map((item) => (
                    <article key={item.label} className="metric-card">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
                <div className="section-gap" />
                <article className="surface-card">
                  <div className="auth-note-head">
                    <h3>Biến động điểm gần đây</h3>
                    <span className="pill">
                      {isLoadingLoyalty ? "Đang tải" : `${memberLoyalty?.recentEntries.length ?? 0} mục`}
                    </span>
                  </div>
                  <div className="stack-list">
                    {memberLoyalty?.recentEntries.length ? (
                      memberLoyalty.recentEntries.map((entry) => (
                        <div key={`${entry.entryType}-${entry.createdAt}`} className="support-compact-item">
                          <strong>
                            {entry.pointsDelta > 0 ? "+" : ""}
                            {formatPoints(entry.pointsDelta)} điểm
                          </strong>
                          <p>{entry.description}</p>
                          <small>
                            Số dư sau cập nhật: {formatPoints(entry.balanceAfter)} điểm • {formatDateTime(entry.createdAt)}
                          </small>
                        </div>
                      ))
                    ) : (
                      <div className="support-compact-item">
                        <strong>Chưa có biến động điểm</strong>
                        <p>Dữ liệu điểm thưởng sẽ xuất hiện khi tài khoản có lịch sử tích lũy hoặc điều chỉnh quyền lợi.</p>
                      </div>
                    )}
                  </div>
                </article>
                <div className="section-gap" />
                <article className="surface-card">
                  <div className="auth-note-head">
                    <h3>Voucher hiện có</h3>
                    <span className="pill">{memberVouchers.length} voucher</span>
                  </div>
                  <div className="stack-list">
                    {memberVouchers.length ? (
                      memberVouchers.map((voucher) => (
                        <div key={voucher.voucherCode} className="support-compact-item">
                          <strong>{voucher.title}</strong>
                          <p>{voucher.description}</p>
                          <small>
                            {formatVoucherAmount(voucher.discountAmount, voucher.currency)} • {formatVoucherStatus(voucher.status)} • Hết hạn {formatDateTime(voucher.expiresAt)}
                            {voucher.status === "RESERVED" && voucher.bookingCode ? ` • Giữ cho ${voucher.bookingCode}` : ""}
                            {voucher.status === "USED" && voucher.usedAt ? ` • Đã dùng lúc ${formatDateTime(voucher.usedAt)}` : ""}
                          </small>
                          {voucher.status === "USED" ? (
                            <div className="auth-action-row">
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => void handleHideUsedVoucher(voucher)}
                                disabled={hidingVoucherCode !== null}
                              >
                                {hidingVoucherCode === voucher.voucherCode
                                  ? "Đang ẩn lịch sử..."
                                  : "Ẩn lịch sử voucher"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="support-compact-item">
                        <strong>Chưa có voucher khả dụng</strong>
                        <p>Voucher mới sẽ xuất hiện tại đây khi tài khoản được cấp ưu đãi hoặc hoàn tất điều kiện tích lũy.</p>
                      </div>
                    )}
                  </div>
                </article>
                <div className="section-gap" />
              </>
            ) : null}
            {!isMemberProfile ? notificationSection : null}
          </div>
        </div>
      </div>
    </section>
  );
}
