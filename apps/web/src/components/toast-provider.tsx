"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { subscribeToast, type ToastPayload } from "@/lib/toast";

interface VisibleToast extends ToastPayload {
  createdAt: number;
}

const TOAST_MESSAGE_BY_QUERY: Record<string, Omit<ToastPayload, "id">> = {
  "can-dang-nhap": {
    message: "Bạn cần đăng nhập để tiếp tục.",
    title: "Yêu cầu xác thực",
    tone: "warning"
  },
  "khong-co-quyen": {
    message: "Bạn không có quyền truy cập khu vực này.",
    title: "Truy cập bị từ chối",
    tone: "warning"
  },
  "chon-chuyen-bay-truoc": {
    message: "Hãy chọn ít nhất một chuyến bay một chiều hoặc khứ hồi trước khi chuyển sang bước đặt vé.",
    title: "Chưa chọn chuyến bay",
    tone: "warning"
  }
};

function buildToastFromQuery(code: string | null) {
  if (!code) {
    return null;
  }

  return TOAST_MESSAGE_BY_QUERY[code] ?? null;
}

export function ToastProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<VisibleToast[]>([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      const nextToast: VisibleToast = {
        ...toast,
        createdAt: Date.now()
      };

      setToasts((currentToasts) => [...currentToasts, nextToast].slice(-4));

      const durationMs = toast.durationMs ?? 4200;
      window.setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((item) => item.id !== nextToast.id)
        );
      }, durationMs);
    });
  }, []);

  const permissionToast = useMemo(
    () => buildToastFromQuery(searchParams.get("thong-bao")),
    [searchParams]
  );

  useEffect(() => {
    if (!permissionToast) {
      return;
    }

    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("thong-bao");

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        ...permissionToast,
        createdAt: Date.now(),
        id: `query-${Date.now()}`
      }
    ].slice(-4));

    startTransition(() => {
      const nextQuery = currentParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false
      });
    });
  }, [pathname, permissionToast, router, searchParams]);

  function dismissToast(toastId: string) {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  }

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`toast-card toast-${toast.tone ?? "info"}`}
        >
          <div className="toast-copy">
            {toast.title ? <strong>{toast.title}</strong> : null}
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            className="toast-dismiss-button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Đóng thông báo"
          >
            Đóng
          </button>
        </article>
      ))}
    </div>
  );
}
