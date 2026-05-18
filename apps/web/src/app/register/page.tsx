"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { PasswordChecklist } from "@/components/password-checklist";
import { StatusChip } from "@/components/status-chip";
import { registerAccount, resolveAuthErrorMessage } from "@/lib/auth-api";
import { persistAuthSession, type AuthSession } from "@/lib/auth-session";
import { isPasswordPolicySatisfied } from "@/lib/password-policy";

const registerStats = [
  {
    label: "Hồ sơ hành khách",
    value: "Lưu sẵn",
    detail: "Giảm thao tác nhập lại giấy tờ và thông tin liên hệ ở lần đặt vé tiếp theo."
  },
  {
    label: "Thông báo chuyến bay",
    value: "Theo thời gian thực",
    detail: "Nhận nhắc làm thủ tục, thay đổi giờ bay và cập nhật cổng ra tàu."
  },
  {
    label: "Ưu đãi cá nhân",
    value: "Theo hành trình",
    detail: "Lưu hồ sơ liên hệ và các nhắc việc cần thiết cho từng chuyến bay."
  }
];

const registerSupportItems = [
  {
    title: "Hỗ trợ tạo tài khoản",
    value: "1900 6868",
    note: "Giải đáp về email đăng ký, xác minh thông tin và các bước khôi phục tài khoản."
  },
  {
    title: "Tra cứu hướng dẫn",
    value: "Trung tâm hỗ trợ trên web",
    note: "Xem trước các câu hỏi thường gặp về tài khoản, hồ sơ hành khách và quên mật khẩu."
  }
];

const registerTrustPoints = [
  "Lưu người liên hệ và hành khách thường dùng cho các chặng nội địa tiếp theo.",
  "Theo dõi thông báo, email vé và các bước chuẩn bị chuyến đi trong cùng một giao diện thân thiện với mobile.",
  "Chuẩn bị trước cho các bước xác minh email, quên mật khẩu và hỗ trợ sau bán."
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const blockedFragments = [fullName, email, phone];
  const normalizedPhone = phone.trim();
  const isPasswordValid = isPasswordPolicySatisfied(password, blockedFragments);
  const isPhoneValid = /^[0-9+]{9,15}$/.test(normalizedPhone);
  const isFormValid =
    fullName.trim().length >= 2 &&
    email.trim().length > 0 &&
    isPhoneValid &&
    isPasswordValid &&
    confirmPassword === password;
  const isPrepared = authSession !== null;

  function handleAuthSuccess(nextAuthSession: AuthSession) {
    persistAuthSession(nextAuthSession);
    setAuthSession(nextAuthSession);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const nextAuthSession = await registerAccount({
        displayName: fullName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        password
      });

      handleAuthSuccess(nextAuthSession);
    } catch (error) {
      setSubmissionError(
        resolveAuthErrorMessage(error, "Không thể tạo tài khoản trong lúc này.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      activeTab="register"
      eyebrow="Tạo tài khoản"
      title="Tạo tài khoản khách hàng để lưu hồ sơ và theo dõi hành trình thuận tiện hơn."
      description="Tài khoản Vietnam Airlines phù hợp với hành khách thường xuyên bay nội địa, cần lưu thông tin liên hệ, hồ sơ hành khách và các cập nhật trước ngày khởi hành. Bạn vẫn có thể xem website với vai trò khách nếu chưa muốn đăng ký ngay."
      stats={registerStats}
      sideTitle="Tạo nền tảng cho những lần đặt vé tiếp theo"
      sideDescription="Ngay từ bước đăng ký, bạn sẽ được gợi ý mật khẩu an toàn để chuẩn bị hồ sơ khách hàng gọn gàng và giảm rủi ro khi cần khôi phục tài khoản."
      trustPoints={registerTrustPoints}
      supportItems={registerSupportItems}
    >
      <div className="auth-form-head">
        <div>
          <span className="section-eyebrow">Đăng ký</span>
          <h2>Chuẩn bị tài khoản khách hàng mới</h2>
        </div>
        <StatusChip
          tone={
            isPrepared
              ? "success"
              : isSubmitting
                ? "info"
                : isFormValid
                  ? "success"
                  : "warning"
          }
          label={
            isPrepared
              ? "Sẵn sàng sử dụng"
              : isSubmitting
                ? "Đang tạo tài khoản"
                : isFormValid
                  ? "Mật khẩu đạt chuẩn"
                  : "Cần bổ sung thông tin"
          }
        />
      </div>

      {isPrepared && authSession ? (
        <article className="auth-success-card">
          <StatusChip tone="success" label="Tạo tài khoản thành công" />
          <h3>Xin chào {authSession.user.displayName}, tài khoản đã sẵn sàng</h3>
          <p>
            Thông tin đăng nhập đã được lưu trên thiết bị này. Bạn có thể vào ngay khu vực
            tài khoản để quản lý hồ sơ hành khách, theo dõi hành trình và tiếp tục các
            bước sau khi mua vé.
          </p>
          <div className="auth-action-row">
            <Link href="/account" className="button button-primary">
              Vào trang tài khoản
            </Link>
            <Link href="/manage-booking" className="button button-secondary">
              Quản lý đặt chỗ
            </Link>
          </div>
        </article>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field-grid auth-field-grid-double">
            <label className="field auth-field">
              <span>Họ và tên</span>
              <input
                type="text"
                placeholder="Nguyễn Minh Anh"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

            <label className="field auth-field">
              <span>Email đăng ký</span>
              <input
                type="email"
                placeholder="tenban@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field auth-field">
              <span>Số điện thoại</span>
              <input
                type="tel"
                placeholder="0912345678"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>

            <PasswordField
              label="Mật khẩu"
              placeholder="Tạo mật khẩu an toàn"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <PasswordField
              label="Nhập lại mật khẩu"
              placeholder="Nhập lại để xác nhận"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <PasswordChecklist
            password={password}
            blockedFragments={blockedFragments}
            confirmPassword={confirmPassword}
          />

          {submissionError ? (
            <div className="auth-note-card">
              <div className="auth-note-head">
                <h3>Không thể tạo tài khoản</h3>
                <StatusChip tone="danger" label="Cần kiểm tra lại" />
              </div>
              <p>{submissionError}</p>
            </div>
          ) : null}

          <div className="auth-note-card">
            <div className="auth-note-head">
              <h3>Sau khi có tài khoản</h3>
              <span className="pill">Khách vẫn có thể duyệt web</span>
            </div>
            <p>
              Tài khoản giúp lưu hồ sơ hành khách, nhận nhắc việc trước giờ bay và theo
              dõi thông báo sau bán. Nếu chưa muốn đăng ký ngay, bạn vẫn có thể tiếp tục
              tìm vé hoặc tra cứu đặt chỗ với vai trò khách.
            </p>
          </div>

          <div className="auth-action-row">
            <button
              type="submit"
              className="button button-primary"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
            <Link href="/login" className="button button-secondary">
              Tôi đã có tài khoản
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
