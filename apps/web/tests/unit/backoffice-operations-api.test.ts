import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createBackofficeOperationsVoucher,
  fetchBackofficeOperationsVouchers
} from "@/lib/backoffice-operations-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("backoffice-operations-api", () => {
  it("tai duoc danh sach voucher van hanh hop le", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          queryEmail: "nnn045856@gmail.com",
          queryCode: null,
          queryStatus: "AVAILABLE",
          vouchers: [
            {
              voucherId: 5,
              userId: 151,
              memberEmail: "nnn045856@gmail.com",
              memberDisplayName: "Hoi vien thu nghiem",
              voucherCode: "OPS52026",
              title: "Bu cham chuyen",
              description: "Ho tro hoi vien bi anh huong chuyen bay.",
              discountAmount: 180000,
              currency: "VND",
              status: "AVAILABLE",
              expiresAt: "2026-06-05T03:00:00Z",
              usedAt: null,
              bookingCode: null
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(fetchBackofficeOperationsVouchers("token-hop-le", {
      email: "nnn045856@gmail.com",
      status: "AVAILABLE"
    })).resolves.toMatchObject({
      vouchers: [
        {
          voucherCode: "OPS52026",
          status: "AVAILABLE"
        }
      ]
    });
  });

  it("tao voucher van hanh tra ve du lieu hop le", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          voucherId: 8,
          userId: 151,
          memberEmail: "nnn045856@gmail.com",
          memberDisplayName: "Hoi vien thu nghiem",
          voucherCode: "OPS62026",
          title: "Ho tro dieu phoi",
          description: "Bu quyen loi cho hoi vien.",
          discountAmount: 220000,
          currency: "VND",
          status: "AVAILABLE",
          expiresAt: "2026-06-10T03:00:00Z",
          usedAt: null,
          bookingCode: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(createBackofficeOperationsVoucher(
      {
        memberEmail: "nnn045856@gmail.com",
        voucherCode: "OPS62026",
        title: "Ho tro dieu phoi",
        description: "Bu quyen loi cho hoi vien.",
        discountAmount: 220000,
        currency: "VND",
        expiresAt: "2026-06-10T03:00:00Z"
      },
      "token-hop-le"
    )).resolves.toMatchObject({
      voucherCode: "OPS62026",
      discountAmount: 220000
    });
  });
});
