"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { PasswordChecklist } from "@/components/password-checklist";
import { PasswordField } from "@/components/password-field";
import { StatusChip } from "@/components/status-chip";
import {
  requestForgotPasswordOtp,
  resetForgottenPassword,
  resolveAuthErrorMessage,
  verifyForgotPasswordOtp
} from "@/lib/auth-api";
import { isPasswordPolicySatisfied } from "@/lib/password-policy";

const forgotStats = [
  {
    label: "Xác minh OTP",
    value: "06 số",
    detail: "Mã xác thực được gửi về email đã đăng ký."
  },
  {
    label: "Thời gian hiệu lực",
    value: "5 phút",
    detail: "Nên hoàn tất đặt lại mật khẩu ngay sau khi nhận OTP."
  },
  {
    label: "Mật khẩu mới",
    value: "Đủ mạnh",
    detail: "Mật khẩu mới phải đáp ứng cùng chính sách bảo mật của đăng ký."
  }
];

const forgotSupportItems = [
  {
    title: "Tổng đài xác minh",
    value: "1900 6868",
    note: "Phù hợp khi bạn không còn truy cập được email."
  },
  {
    title: "Email hỗ trợ",
    value: "support@vietnam-airlines.vn",
    note: "Gửi kèm email đăng ký hoặc mã đặt chỗ để được hỗ trợ nhanh hơn."
  }
];

const forgotTrustPoints = [
  "Kiểm tra email đã đăng ký trước khi gửi OTP.",
  "Chặn OTP sai, hết hạn hoặc đã sử dụng.",
  "Chặn mật khẩu mới yếu trước khi cập nhật tài khoản."
];

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim();
  const isOtpReady = /^\d{6}$/.test(otp);
  const isPasswordReady =
    isPasswordPolicySatisfied(password, [normalizedEmail]) &&
    confirmPassword.length > 0 &&
    confirmPassword === password;

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedEmail || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionMessage(null);

    try {
      const response = await requestForgotPasswordOtp(normalizedEmail);
      setSubmissionMessage(response.message);
      setStep(2);
    } catch (error) {
      setSubmissionError(
        resolveAuthErrorMessage(error, "Không thể gửi OTP lúc này. Vui lòng thử lại.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedEmail || !isOtpReady || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionMessage(null);

    try {
      const response = await verifyForgotPasswordOtp(normalizedEmail, otp);
      if (!response.verified) {
        setSubmissionError(response.message || "OTP chưa hợp lệ. Vui lòng thử lại.");
        return;
      }

      setSubmissionMessage(response.message);
      setStep(3);
    } catch (error) {
      setSubmissionError(
        resolveAuthErrorMessage(error, "Không thể xác minh OTP lúc này. Vui lòng thử lại.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedEmail || !isOtpReady || !isPasswordReady || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionMessage(null);

    try {
      await resetForgottenPassword(normalizedEmail, otp, password);
      setStep(4);
    } catch (error) {
      setSubmissionError(
        resolveAuthErrorMessage(error, "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (!normalizedEmail || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionMessage(null);

    try {
      const response = await requestForgotPasswordOtp(normalizedEmail);
      setSubmissionMessage(response.message);
    } catch (error) {
      setSubmissionError(
        resolveAuthErrorMessage(error, "Không thể gửi lại OTP lúc này. Vui lòng thử lại.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      activeTab="forgot-password"
      eyebrow="Khôi phục tài khoản"
      title="Đặt lại mật khẩu bằng OTP gửi tới email đã đăng ký."
      description="Nhập email, xác minh OTP và tạo mật khẩu mới đủ mạnh để tiếp tục đăng nhập."
      stats={forgotStats}
      sideTitle="Khôi phục theo từng bước"
      sideDescription="Mỗi bước đều hiển thị trạng thái rõ ràng để bạn biết cần làm gì tiếp theo."
      trustPoints={forgotTrustPoints}
      supportItems={forgotSupportItems}
    >
      <div className="auth-form-head">
        <div>
          <span className="section-eyebrow">Quên mật khẩu</span>
          <h2>Khôi phục tài khoản qua mã OTP</h2>
        </div>
        <StatusChip
          tone={step === 4 ? "success" : "warning"}
          label={step === 4 ? "Hoàn tất" : `Bước ${step}/4`}
        />
      </div>

      <div className="auth-progress" aria-label="Tiến trình quên mật khẩu">
        {["Nhập email", "Xác minh OTP", "Đặt mật khẩu mới", "Hoàn tất"].map((label, index) => {
          const currentStep = index + 1;
          const state =
            currentStep < step ? "done" : currentStep === step ? "current" : "upcoming";

          return (
            <div
              key={label}
              className={`auth-progress-step auth-progress-step-${state}`}
            >
              <strong>{currentStep}</strong>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {submissionError ? (
        <div className="auth-note-card">
          <div className="auth-note-head">
            <h3>Không thể tiếp tục</h3>
            <span className="pill">Cần kiểm tra lại</span>
          </div>
          <p>{submissionError}</p>
        </div>
      ) : null}

      {submissionMessage ? (
        <div className="auth-note-card">
          <div className="auth-note-head">
            <h3>Đã ghi nhận yêu cầu</h3>
            <span className="pill">Đang xử lý</span>
          </div>
          <p>{submissionMessage}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <div className="auth-field-grid">
            <label className="field auth-field">
              <span>Email đã đăng ký</span>
              <input
                type="email"
                placeholder="tenban@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="auth-action-row">
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Đang gửi OTP..." : "Gửi mã OTP"}
            </button>
            <Link href="/login" className="button button-secondary">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="auth-form" onSubmit={handleOtpSubmit}>
          <div className="auth-note-card">
            <div className="auth-note-head">
              <h3>Nhập mã OTP</h3>
              <span className="pill">{maskEmail(normalizedEmail)}</span>
            </div>
            <p>Kiểm tra hộp thư đến hoặc thư rác rồi nhập mã gồm 6 chữ số.</p>
          </div>

          <div className="auth-field-grid">
            <label className="field auth-field">
              <span>Mã OTP</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                pattern="\d{6}"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </label>
          </div>

          <div className="auth-helper-row">
            <button
              type="button"
              className="text-button"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              Đổi lại email
            </button>
            <button
              type="button"
              className="text-button"
              onClick={handleResendOtp}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi lại mã"}
            </button>
          </div>

          <div className="auth-action-row">
            <button
              type="submit"
              className="button button-primary"
              disabled={!isOtpReady || isSubmitting}
            >
              {isSubmitting ? "Đang xác minh..." : "Xác minh OTP"}
            </button>
            <Link href="/support" className="button button-secondary">
              Cần hỗ trợ thêm
            </Link>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form className="auth-form" onSubmit={handleResetSubmit}>
          <div className="auth-field-grid auth-field-grid-double">
            <PasswordField
              label="Mật khẩu mới"
              placeholder="Tạo mật khẩu mới"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <PasswordField
              label="Nhập lại mật khẩu mới"
              placeholder="Nhập lại để xác nhận"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <PasswordChecklist
            password={password}
            blockedFragments={[normalizedEmail]}
            confirmPassword={confirmPassword}
          />

          <div className="auth-action-row">
            <button
              type="submit"
              className="button button-primary"
              disabled={!isPasswordReady || isSubmitting}
            >
              {isSubmitting ? "Đang cập nhật..." : "Hoàn tất đặt lại mật khẩu"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
            >
              Quay lại bước OTP
            </button>
          </div>
        </form>
      ) : null}

      {step === 4 ? (
        <article className="auth-success-card">
          <StatusChip tone="success" label="Khôi phục hoàn tất" />
          <h3>Mật khẩu mới đã sẵn sàng để sử dụng</h3>
          <p>Bạn có thể đăng nhập lại bằng mật khẩu mới.</p>
          <div className="auth-action-row">
            <Link href="/login" className="button button-primary">
              Quay lại đăng nhập
            </Link>
            <Link href="/manage-booking" className="button button-secondary">
              Quản lý đặt chỗ
            </Link>
          </div>
        </article>
      ) : null}
    </AuthShell>
  );
}
