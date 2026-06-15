"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { StatusChip } from "@/components/status-chip";
import {
  buildGoogleOAuthLoginUrl,
  loginWithPassword,
  resolveAuthErrorMessage
} from "@/lib/auth-api";
import {
  AUTH_SESSION_UPDATED_EVENT,
  loadValidAuthSession,
  persistAuthSession,
  type AuthSession
} from "@/lib/auth-session";

const loginStats = [
  {
    label: "Đặt chỗ sắp bay",
    value: "02 hành trình",
    detail: "Xem lại lịch bay, dịch vụ đã chọn và thời hạn làm thủ tục."
  },
  {
    label: "Hồ sơ hành khách",
    value: "Lưu sẵn",
    detail: "Giảm thao tác nhập lại thông tin liên hệ và giấy tờ ở lần đặt vé tiếp theo."
  },
  {
    label: "Thông báo cá nhân",
    value: "24/7",
    detail: "Nhận cảnh báo thay đổi giờ bay, cổng ra tàu và trạng thái thanh toán."
  }
];

const supportItems = [
  {
    title: "Tổng đài ưu tiên",
    value: "1900 6868",
    note: "Hỗ trợ đăng nhập, tra cứu đặt chỗ và xử lý yêu cầu gấp."
  },
  {
    title: "Email xác minh",
    value: "support@vietnam-airlines.vn",
    note: "Phù hợp khi cần đối chiếu email đăng ký hoặc thông tin tài khoản."
  }
];

const trustPoints = [
  "Lưu lịch sử đặt chỗ, hóa đơn và thông báo chuyến bay trong cùng một nơi.",
  "Đồng bộ hồ sơ hành khách thường dùng để đặt vé nhanh hơn trên cả điện thoại lẫn máy tính.",
  "Nhận nhắc việc trước ngày khởi hành, email vé và các cập nhật mới nhất về hành trình."
];

function resolveSafeRedirectTarget(value: string | null | undefined) {
  const redirectTo = value?.trim();

  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shouldRemember, setShouldRemember] = useState(true);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReadyToContinue = authSession !== null;
  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  useEffect(() => {
    function syncAuthState() {
      const nextAuthSession = loadValidAuthSession();

      if (!nextAuthSession) {
        return;
      }

      setAuthSession(nextAuthSession);
      window.location.replace(
        resolveSafeRedirectTarget(searchParams.get("redirectTo"))
      );
    }

    syncAuthState();
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncAuthState);

    return () => {
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncAuthState);
    };
  }, [searchParams]);

  function handleAuthSuccess(nextAuthSession: AuthSession) {
    persistAuthSession(nextAuthSession, shouldRemember);
    setAuthSession(nextAuthSession);
    window.location.assign(
      resolveSafeRedirectTarget(searchParams.get("redirectTo"))
    );
  }

  function handleGoogleLogin() {
    const redirectTo = searchParams.get("redirectTo")?.trim();
    window.location.href = buildGoogleOAuthLoginUrl(redirectTo || "/");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim() || isSubmitting) {
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const nextAuthSession = await loginWithPassword({
        email: email.trim(),
        password
      });

      handleAuthSuccess(nextAuthSession);
    } catch (error) {
      setSubmissionError(
        resolveAuthErrorMessage(error, "Không thể đăng nhập trong lúc này.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      activeTab="login"
      eyebrow="Tài khoản hành khách"
      title="Đăng nhập để theo dõi hành trình và các cập nhật dành riêng cho bạn."
      description="Khách hàng có tài khoản có thể xem lại đặt chỗ, lưu hồ sơ hành khách, nhận thông báo trước giờ bay và quản lý tiện ích sau khi mua vé. Nếu chưa có tài khoản, bạn vẫn có thể tiếp tục xem website và đặt vé với vai trò khách."
      stats={loginStats}
      sideTitle="Một tài khoản cho toàn bộ hành trình"
      sideDescription="Thông tin đặt chỗ, hồ sơ hành khách và thông báo thay đổi chuyến bay được gom về cùng một luồng theo dõi để hành khách thao tác nhanh hơn sau khi đăng nhập."
      trustPoints={trustPoints}
      supportItems={supportItems}
    >
      <div className="auth-form-head">
        <div>
          <span className="section-eyebrow">Đăng nhập</span>
          <h2>Tiếp tục vào khu vực tài khoản</h2>
        </div>
        <StatusChip
          tone={isReadyToContinue ? "success" : isSubmitting ? "info" : "neutral"}
          label={
            isReadyToContinue
              ? "Sẵn sàng sử dụng"
              : isSubmitting
                ? "Đang xác thực"
                : "Chờ xác thực"
          }
        />
      </div>

      {isReadyToContinue && authSession ? (
        <article className="auth-success-card">
          <StatusChip tone="success" label="Đăng nhập thành công" />
          <h3>Xin chào {authSession.user.displayName}, tài khoản của bạn đã sẵn sàng</h3>
          <p>
            Thông tin đăng nhập đã được lưu{" "}
            {shouldRemember ? "trên thiết bị này" : "trong lần truy cập hiện tại"} để bạn
            tiếp tục theo dõi hành trình, email vé và các cập nhật liên quan tới đặt chỗ
            của mình.
          </p>
          <div className="auth-action-row">
            <Link href="/" className="button button-primary">
              Về trang chủ
            </Link>
            <Link href="/manage-booking" className="button button-secondary">
              Quản lý đặt chỗ
            </Link>
          </div>
        </article>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-social-box">
            <button
              type="button"
              className="auth-google-button"
              onClick={handleGoogleLogin}
              aria-label="Đăng nhập bằng Google"
            >
              <span className="auth-google-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path
                    fill="#4285F4"
                    d="M21.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.4c-.2 1.3-.9 2.4-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.7z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7C4.6 19.8 8 22 12 22z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.5H3C2.3 8.9 2 10.4 2 12s.3 3.1 1 4.5l3.4-2.7z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8 2 4.6 4.2 3 7.5l3.4 2.7C7.2 7.8 9.4 6.1 12 6.1z"
                  />
                </svg>
              </span>
            </button>
          </div>

          <div className="auth-social-divider">
            <span>Hoặc đăng nhập bằng mật khẩu</span>
          </div>

          <div className="auth-field-grid">
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

            <PasswordField
              label="Mật khẩu"
              placeholder="Nhập mật khẩu của bạn"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {submissionError ? (
            <div className="auth-note-card">
              <div className="auth-note-head">
                <h3>Không thể đăng nhập</h3>
                <StatusChip tone="danger" label="Cần kiểm tra lại" />
              </div>
              <p>{submissionError}</p>
            </div>
          ) : null}

          <div className="auth-helper-row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={shouldRemember}
                onChange={(event) => setShouldRemember(event.target.checked)}
              />
              <span>Ghi nhớ tài khoản trên thiết bị cá nhân.</span>
            </label>

            <Link href="/forgot-password" className="auth-inline-link">
              Quên mật khẩu?
            </Link>
          </div>

          <div className="auth-note-card">
            <div className="auth-note-head">
              <h3>Dùng tài khoản để làm gì?</h3>
              <span className="pill">Khách vẫn xem web bình thường</span>
            </div>
            <p>
              Bạn vẫn có thể tìm chuyến bay, xem tình trạng chuyến bay, quản lý đặt chỗ
              và đọc cẩm nang hành trình mà không cần đăng nhập. Tài khoản giúp rút ngắn
              thao tác khi cần lưu hồ sơ, nhận email vé và xem lại lịch sử giao dịch.
            </p>
          </div>

          <div className="auth-action-row">
            <button
              type="submit"
              className="button button-primary"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "Đang đăng nhập..." : "Tiếp tục đăng nhập"}
            </button>
            <Link href="/register" className="button button-secondary">
              Tạo tài khoản mới
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
