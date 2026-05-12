import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiClientError,
  requestApi,
  resolveApiClientErrorMessage
} from "@/lib/api-client";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("api-client", () => {
  it("giu nguyen message json khi backend tra loi loi", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 403,
          message: "Bạn không có quyền truy cập khu vực này.",
          errors: {
            role: "Thiếu vai trò phù hợp."
          }
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      requestApi("/api/backoffice/admin", {
        method: "GET",
        showErrorToast: false
      })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      status: 403,
      message: "Bạn không có quyền truy cập khu vực này."
    });
  });

  it("tra message ket noi khi khong goi duoc may chu", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as typeof fetch;

    await expect(
      requestApi("/api/flights/search", {
        method: "GET",
        showErrorToast: false
      })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      status: 0,
      message: "Không thể kết nối tới máy chủ dịch vụ."
    });
  });

  it("uu tien loi field dau tien khi hien thi message", () => {
    const error = new ApiClientError("Thông báo tổng quát", 400, {
      email: "Email không hợp lệ."
    });

    expect(
      resolveApiClientErrorMessage(error, "Không thể xử lý yêu cầu.")
    ).toBe("Email không hợp lệ.");
  });
});
