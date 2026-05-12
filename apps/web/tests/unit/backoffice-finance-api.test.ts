import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchBackofficeRefunds } from "@/lib/backoffice-finance-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("backoffice-finance-api", () => {
  it("tai duoc danh sach hoan ve hop le", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 55,
            bookingCode: "A6C2P1",
            bookingStatus: "refund_pending",
            contactName: "Nguyen Van A",
            reason: "Thay doi ke hoach",
            refundAmount: 1490000,
            status: "pending",
            createdAt: "2026-05-10T10:00:00+07:00"
          }
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(fetchBackofficeRefunds("token-hop-le")).resolves.toMatchObject([
      {
        bookingCode: "A6C2P1",
        status: "pending"
      }
    ]);
  });

  it("giu nguyen message backend khi bi tu choi quyen", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 403,
          message: "Bạn không có quyền thực hiện thao tác này.",
          errors: {}
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(fetchBackofficeRefunds("token-hop-le")).rejects.toMatchObject({
      message: "Bạn không có quyền thực hiện thao tác này.",
      status: 403
    });
  });
});
