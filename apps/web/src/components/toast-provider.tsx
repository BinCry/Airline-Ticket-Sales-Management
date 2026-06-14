"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { subscribeToast, type ToastPayload } from "@/lib/toast";

interface VisibleToast extends ToastPayload {
  createdAt: number;
}

interface EnqueueToastOptions {
  createdAt?: number;
  onDismissLater: (toastId: string, durationMs: number) => void;
  setToasts: (updater: (currentToasts: VisibleToast[]) => VisibleToast[]) => void;
  toast: ToastPayload;
}

const DEFAULT_TOAST_DURATION_MS = 4200;

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

export function enqueueToast({
  createdAt = Date.now(),
  onDismissLater,
  setToasts,
  toast
}: EnqueueToastOptions): VisibleToast {
  const nextToast: VisibleToast = {
    ...toast,
    createdAt
  };

  setToasts((currentToasts) => [...currentToasts, nextToast].slice(-4));
  onDismissLater(nextToast.id, toast.durationMs ?? DEFAULT_TOAST_DURATION_MS);

  return nextToast;
}

export function ToastProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<VisibleToast[]>([]);

  function scheduleDismiss(toastId: string, durationMs: number) {
    window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((item) => item.id !== toastId)
      );
    }, durationMs);
  }

  useEffect(() => {
    return subscribeToast((toast) => {
      enqueueToast({
        onDismissLater: scheduleDismiss,
        setToasts,
        toast
      });
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

    const createdAt = Date.now();

    enqueueToast({
      createdAt,
      onDismissLater: scheduleDismiss,
      setToasts,
      toast: {
        ...permissionToast,
        id: `query-${createdAt}`
      }
    });

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
