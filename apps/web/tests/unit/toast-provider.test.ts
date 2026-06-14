import { describe, expect, it, vi } from "vitest";

import { enqueueToast } from "@/components/toast-provider";
import type { ToastPayload } from "@/lib/toast";

interface VisibleToast extends ToastPayload {
  createdAt: number;
}

function createToast(overrides: Partial<ToastPayload> = {}): ToastPayload {
  return {
    id: "toast-chon-chuyen-bay",
    message: "Hãy chọn chuyến bay trước khi sang bước đặt vé.",
    title: "Chưa chọn chuyến bay",
    tone: "warning",
    ...overrides
  };
}

describe("toast-provider", () => {
  it("hẹn tự tắt với thời lượng mặc định khi thêm toast", () => {
    let toasts: VisibleToast[] = [];
    const onDismissLater = vi.fn();

    const nextToast = enqueueToast({
      createdAt: 1700000000000,
      onDismissLater,
      setToasts: (updater) => {
        toasts = updater(toasts);
      },
      toast: createToast()
    });

    expect(nextToast).toEqual({
      createdAt: 1700000000000,
      id: "toast-chon-chuyen-bay",
      message: "Hãy chọn chuyến bay trước khi sang bước đặt vé.",
      title: "Chưa chọn chuyến bay",
      tone: "warning"
    });
    expect(toasts).toEqual([nextToast]);
    expect(onDismissLater).toHaveBeenCalledWith("toast-chon-chuyen-bay", 4200);
  });

  it("giữ nguyên thời lượng riêng nếu toast có cấu hình duration", () => {
    let toasts: VisibleToast[] = [];
    const onDismissLater = vi.fn();

    enqueueToast({
      createdAt: 1700000000100,
      onDismissLater,
      setToasts: (updater) => {
        toasts = updater(toasts);
      },
      toast: createToast({
        durationMs: 2600,
        id: "toast-rieng"
      })
    });

    expect(toasts).toHaveLength(1);
    expect(onDismissLater).toHaveBeenCalledWith("toast-rieng", 2600);
  });
});
