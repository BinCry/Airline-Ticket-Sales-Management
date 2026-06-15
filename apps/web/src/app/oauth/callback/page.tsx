"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { StatusChip } from "@/components/status-chip";
import { exchangeOAuthCode, resolveAuthErrorMessage } from "@/lib/auth-api";
import { persistAuthSession } from "@/lib/auth-session";

function resolveSafeRedirectTarget(value: string | null | undefined) {
  const redirectTo = value?.trim();

  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Đang hoàn tất đăng nhập Google.");
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (hasExchangedRef.current) {
      return;
    }
    hasExchangedRef.current = true;

    const code = searchParams.get("code")?.trim();
    const redirectTo = searchParams.get("redirectTo")?.trim();
    if (!code) {
      setStatus("error");
      setMessage("Thiếu mã đăng nhập Google.");
      return;
    }

    void exchangeOAuthCode(code)
      .then((authSession) => {
        persistAuthSession(authSession, true);
        setStatus("success");
        setMessage("Đăng nhập Google thành công.");
        window.location.replace(resolveSafeRedirectTarget(redirectTo));
      })
      .catch((error) => {
        setStatus("error");
        setMessage(resolveAuthErrorMessage(error, "Không thể hoàn tất đăng nhập Google."));
      });
  }, [searchParams]);

  return (
    <main className="section auth-page">
      <div className="container auth-callback-layout">
        <article className="auth-success-card auth-callback-card">
          <StatusChip
            tone={status === "success" ? "success" : status === "error" ? "danger" : "info"}
            label={status === "success" ? "Hoàn tất" : status === "error" ? "Cần kiểm tra" : "Đang xử lý"}
          />
          <h1>Đăng nhập Google</h1>
          <p>{message}</p>
          {status === "error" ? (
            <div className="auth-action-row">
              <Link href="/login" className="button button-primary">
                Quay lại đăng nhập
              </Link>
            </div>
          ) : null}
        </article>
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackContent />
    </Suspense>
  );
}
