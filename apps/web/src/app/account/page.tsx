"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { loadActiveAuthSession, type AuthSession } from "@/lib/auth-session";
import {
  createMyPassenger,
  deleteMyPassenger,
  fetchMyPassengers,
  fetchMyProfile,
  MyAccountApiError,
  updateMyPassenger,
  updateMyProfile,
  type MyPassenger,
  type MyProfile,
  type UpdateMyProfilePayload,
  type UpsertMyPassengerPayload
} from "@/lib/my-account-api";

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
  const parsedDate = new Date(dateOfBirth);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateOfBirth;
  }

  return new Intl.DateTimeFormat("vi-VN").format(parsedDate);
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
    emailVerified: sessionUser.emailVerified,
    status: "local_session",
    roles: sessionUser.roles
  };
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
  const [profileForm, setProfileForm] = useState<UpdateMyProfilePayload>(EMPTY_PROFILE_FORM);
  const [passengers, setPassengers] = useState<MyPassenger[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileActionError, setProfileActionError] = useState<string | null>(null);
  const [profileActionSuccess, setProfileActionSuccess] = useState<string | null>(null);
  const [passengerError, setPassengerError] = useState<string | null>(null);
  const [passengerForm, setPassengerForm] = useState<UpsertMyPassengerPayload>(EMPTY_PASSENGER_FORM);
  const [editingPassengerId, setEditingPassengerId] = useState<number | null>(null);
  const [passengerActionError, setPassengerActionError] = useState<string | null>(null);
  const [passengerActionSuccess, setPassengerActionSuccess] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassengers, setIsLoadingPassengers] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassenger, setIsSubmittingPassenger] = useState(false);
  const [deletingPassengerId, setDeletingPassengerId] = useState<number | null>(null);

  useEffect(() => {
    setAuthSession(loadActiveAuthSession());
    setHasLoadedSession(true);
  }, []);

  useEffect(() => {
    if (!authSession?.accessToken) {
      setCustomerProfile(null);
      setProfileForm(EMPTY_PROFILE_FORM);
      setPassengers([]);
      setProfileError(null);
      setProfileActionError(null);
      setProfileActionSuccess(null);
      setPassengerError(null);
      setPassengerActionError(null);
      setPassengerActionSuccess(null);
      setEditingPassengerId(null);
      setPassengerForm(EMPTY_PASSENGER_FORM);
      setIsLoadingProfile(false);
      setIsLoadingPassengers(false);
      return;
    }

    const accessToken = authSession.accessToken;
    let isCancelled = false;

    async function loadCustomerData() {
      setIsLoadingProfile(true);
      setIsLoadingPassengers(true);
      setProfileError(null);
      setPassengerError(null);

      try {
        const [nextCustomerProfile, nextPassengers] = await Promise.all([
          fetchMyProfile(accessToken),
          fetchMyPassengers(accessToken)
        ]);

        if (!isCancelled) {
          setCustomerProfile(nextCustomerProfile);
          setProfileForm(buildProfileForm(nextCustomerProfile));
          setPassengers(sortPassengers(nextPassengers));
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message = resolveAccountError(
          error,
          "Không thể đồng bộ dữ liệu tài khoản lúc này."
        );
        setProfileError(message);
        setPassengerError(message);
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
          setIsLoadingPassengers(false);
        }
      }
    }

    void loadCustomerData();

    return () => {
      isCancelled = true;
    };
  }, [authSession]);

  const activeProfile = customerProfile ?? buildFallbackProfile(authSession);
  const roleSummary = activeProfile?.roles.join(", ") ?? "khách";
  const phoneSummary = activeProfile?.phone?.trim() ? activeProfile.phone : "Chưa cập nhật";
  const isEditingPassenger = editingPassengerId !== null;
  const accountStats = [
    {
      label: "Hành khách thường dùng",
      value: String(passengers.length)
    },
    {
      label: "Vai trò hiện tại",
      value: roleSummary
    },
    {
      label: "Trạng thái hồ sơ",
      value: activeProfile
        ? (isLoadingProfile ? "Đang đồng bộ" : "Sẵn sàng")
        : "Chưa đăng nhập"
    }
  ];
  const activityFeed = activeProfile
    ? [
        {
          title: "Hồ sơ tài khoản",
          time: isLoadingProfile ? "Đang đồng bộ" : "Đã sẵn sàng",
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
          summary: `Vai trò đang dùng: ${roleSummary}.`
        }
      ]
    : [
        {
          title: "Chưa có phiên đăng nhập",
          time: "Yêu cầu đăng nhập",
          summary: "Đăng nhập để đồng bộ hồ sơ tài khoản và hành khách thường dùng."
        }
      ];

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
  }

  function resetProfileForm() {
    setProfileForm(buildProfileForm(activeProfile));
    setProfileActionError(null);
    setProfileActionSuccess(null);
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
      setCustomerProfile(nextProfile);
      setProfileForm(buildProfileForm(nextProfile));
      setProfileError(null);
      setProfileActionSuccess("Đã cập nhật hồ sơ tài khoản.");
    } catch (error) {
      setProfileActionError(
        resolveAccountError(error, "Không thể lưu hồ sơ tài khoản lúc này.")
      );
    } finally {
      setIsSubmittingProfile(false);
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

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card">
          <div>
            <span className="section-eyebrow">
              {activeProfile ? `Xin chào, ${activeProfile.displayName}` : "Tài khoản khách hàng"}
            </span>
            <h1 className="page-title">
              {activeProfile
                ? "Phiên của bạn đang được lưu cục bộ để tiếp tục theo dõi hành trình, hồ sơ và các thông báo quan trọng."
                : "Theo dõi điểm thưởng, hành trình sắp bay và thông báo quan trọng tại một nơi."}
            </h1>
            <p className="page-hero-copy">
              {activeProfile
                ? `Email đang dùng là ${activeProfile.email}. Số điện thoại: ${phoneSummary}. Vai trò hiện tại: ${roleSummary}. Bạn có thể tiếp tục quản lý hồ sơ thường dùng và các cập nhật mới nhất liên quan đến chuyến bay đã đặt.`
                : "Tài khoản giúp hành khách xem lại điểm hội viên, voucher khả dụng, hồ sơ thường dùng và những cập nhật mới nhất liên quan đến chuyến bay đã đặt."}
            </p>
            {activeProfile ? (
              <div className="auth-helper-row">
                <span className="pill">{activeProfile.email}</span>
                <span className="pill">
                  {activeProfile.emailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                </span>
                <span className="pill">Vai trò: {roleSummary}</span>
                <span className="pill">Số điện thoại: {phoneSummary}</span>
                <span className="pill">
                  {isLoadingProfile ? "Đang đồng bộ hồ sơ" : "Hồ sơ tài khoản đã sẵn sàng"}
                </span>
              </div>
            ) : null}
            {profileError && activeProfile ? (
              <div className="auth-note-card">
                <div className="auth-note-head">
                  <h3>Chưa đồng bộ được hồ sơ mới nhất</h3>
                  <span className="pill">Đang dùng dữ liệu phiên cục bộ</span>
                </div>
                <p>{profileError}</p>
              </div>
            ) : null}
            {hasLoadedSession && !activeProfile ? (
              <div className="auth-note-card">
                <div className="auth-note-head">
                  <h3>Chưa có phiên đăng nhập cục bộ</h3>
                  <span className="pill">Có thể đăng nhập bất cứ lúc nào</span>
                </div>
                <p>
                  Bạn vẫn có thể xem nội dung tham khảo trên website, nhưng cần đăng nhập
                  để đồng bộ hồ sơ hành khách và lưu phiên làm việc trên trình duyệt này.
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
          <div className="profile-media-card">
            <Image
              src="/images/airport-terminal.jpg"
              alt="Không gian sân bay dùng làm hình nền khu tài khoản"
              fill
              sizes="(max-width: 1180px) 100vw, 360px"
            />
            <div className="profile-media-overlay">
              <span className="pill">Hội viên Vietnam Airlines</span>
              <h3>Hạng Vàng</h3>
              <p>Đồng bộ đặt chỗ, thông báo, điểm thưởng và quyền lợi theo tuyến.</p>
            </div>
          </div>
        </div>

        <div className="section-gap" />
        <div className="metric-grid">
          {accountStats.map((item) => (
            <article key={item.label} className="metric-card metric-card-strong">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="section-gap" />
        <div className="section-split">
          <div>
            <SectionHeading
              eyebrow="Hồ sơ tài khoản"
              title="Cập nhật nhanh tên hiển thị và số điện thoại đang dùng"
              description="Thông tin này được dùng để đồng bộ hồ sơ khách hàng trên phiên hiện tại và các lần đăng nhập sau."
            />
            {activeProfile ? (
              <form className="surface-card" onSubmit={handleProfileSubmit}>
                <div className="auth-note-head">
                  <h3>Cập nhật hồ sơ tài khoản</h3>
                  <span className="pill">Đồng bộ hồ sơ</span>
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
                      <span className="pill">Đã đồng bộ</span>
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
                    Khôi phục
                  </button>
                </div>
              </form>
            ) : null}

            <div className="section-gap" />
            <SectionHeading
              eyebrow="Hồ sơ & hành khách"
              title="Lưu sẵn hồ sơ hành khách để đặt vé nhanh hơn cho các chuyến tiếp theo"
              description="Thông tin giấy tờ, tùy chọn chỗ ngồi và ghi chú cần thiết được lưu gọn gàng để giảm thao tác nhập lại."
            />
            {passengerError && activeProfile ? (
              <div className="auth-note-card">
                <div className="auth-note-head">
                  <h3>Chưa đồng bộ được danh sách hành khách</h3>
                  <span className="pill">Đang dùng dữ liệu hiện có</span>
                </div>
                <p>{passengerError}</p>
              </div>
            ) : null}
            {activeProfile ? (
              <form className="surface-card" onSubmit={handlePassengerSubmit}>
                <div className="auth-note-head">
                  <h3>
                    {isEditingPassenger
                      ? "Cập nhật hành khách thường dùng"
                      : "Thêm hành khách thường dùng"}
                  </h3>
                  <span className="pill">
                    {isEditingPassenger ? "Chế độ chỉnh sửa" : "Chế độ thêm mới"}
                  </span>
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
                      <span className="pill">Đã đồng bộ</span>
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
                    <small>Dữ liệu passenger chưa sẵn sàng trên tài khoản này</small>
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
              <div className="auth-helper-row">
                <span className="pill">
                  {isLoadingPassengers
                    ? "Đang đồng bộ hành khách"
                    : `Đã tải ${passengers.length} hành khách`}
                </span>
              </div>
            ) : null}
          </div>
          <div>
            <SectionHeading
              eyebrow="Trung tâm thông báo"
              title="Mọi cập nhật quan trọng được gom về một dòng thời gian dễ theo dõi"
              description="Hành khách có thể xem lại trạng thái thanh toán, mở làm thủ tục, thay đổi chuyến bay và phản hồi từ bộ phận hỗ trợ."
            />
            <div className="stack-list">
              {activityFeed.map((item) => (
                <article key={item.title} className="surface-card notification-card">
                  <span className="pill">{item.time}</span>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
