import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchMyLoyalty,
  createMyPassenger,
  deleteMyPassenger,
  fetchMyPassengers,
  fetchMyProfile,
  fetchMyVouchers,
  uploadMyAvatar,
  changeMyPassword,
  updateMyPassenger,
  updateMyProfile
} from "@/lib/my-account-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("my-account-api", () => {
  it("tai ho so customer tu backend voi bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 101,
          email: "khach@example.com",
          displayName: "Khach Hang",
          phone: "0909123456",
          emailVerified: true,
          status: "active",
          roles: ["customer"]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(fetchMyProfile("token-123")).resolves.toEqual({
      id: 101,
      email: "khach@example.com",
      displayName: "Khach Hang",
      phone: "0909123456",
      avatarUrl: null,
      emailVerified: true,
      status: "active",
      roles: ["customer"]
    });
  });

  it("cap nhat profile qua backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 101,
          email: "khach@example.com",
          displayName: "Khach Hang Moi",
          phone: "0911222333",
          avatarUrl: "/uploads/avatars/101-test.jpg",
          emailVerified: true,
          status: "active",
          roles: ["customer"]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      updateMyProfile("token-profile", {
        displayName: "Khach Hang Moi",
        phone: "0911222333"
      })
    ).resolves.toMatchObject({
      displayName: "Khach Hang Moi",
      phone: "0911222333",
      avatarUrl: "/uploads/avatars/101-test.jpg"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/me/profile",
      expect.objectContaining({
        method: "PATCH"
      })
    );
  });

  it("doi mat khau profile qua backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204
      })
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      changeMyPassword("token-password", {
        currentPassword: "MatkhauCu!1",
        newPassword: "MatkhauMoi!2"
      })
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/me/change-password",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("cap nhat avatar profile bang multipart", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 101,
          email: "khach@example.com",
          displayName: "Khach Hang",
          phone: "0909123456",
          avatarUrl: "/uploads/avatars/101-test.jpg",
          emailVerified: true,
          status: "active",
          roles: ["customer"]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    const avatar = new File(["avatar"], "avatar.jpg", { type: "image/jpeg" });

    await expect(uploadMyAvatar("token-avatar", avatar)).resolves.toMatchObject({
      avatarUrl: "/uploads/avatars/101-test.jpg"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/me/avatar",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("bao loi ro rang khi phien dang nhap het han", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Phiên không hợp lệ." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      })
    ) as typeof fetch;

    await expect(fetchMyProfile("token-het-han")).rejects.toMatchObject({
      name: "MyAccountApiError",
      status: 401,
      message: "Phiên không hợp lệ."
    });
  });

  it("tai danh sach passenger cua customer tu backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 201,
            fullName: "Nguyen Minh Anh",
            passengerType: "adult",
            dateOfBirth: "1999-06-15",
            documentType: "CCCD",
            documentNumber: "079123456789",
            isPrimary: true
          }
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(fetchMyPassengers("token-456")).resolves.toEqual([
      {
        id: 201,
        fullName: "Nguyen Minh Anh",
        passengerType: "adult",
        dateOfBirth: "1999-06-15",
        documentType: "CCCD",
        documentNumber: "079123456789",
        isPrimary: true
      }
    ]);
  });

  it("tai du lieu loyalty cua member tu backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          membershipTier: "Vang",
          pointBalance: 12500,
          lifetimePoints: 43200,
          availableVoucherCount: 2,
          recentEntries: [
            {
              entryType: "accrual",
              pointsDelta: 2500,
              balanceAfter: 12500,
              bookingCode: "QC5004",
              description: "Cong diem sau chuyen bay",
              createdAt: "2026-05-10T03:20:00Z"
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
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(fetchMyLoyalty("token-member")).resolves.toMatchObject({
      membershipTier: "Vang",
      pointBalance: 12500,
      availableVoucherCount: 2
    });
  });

  it("tai danh sach voucher cua member tu backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            voucherCode: "MEM52026",
            title: "Voucher hoi vien",
            description: "Giam 180000 cho chang noi dia",
            discountAmount: 180000,
            currency: "VND",
            status: "AVAILABLE",
            expiresAt: "2026-05-31T16:59:59Z",
            usedAt: null,
            bookingCode: null
          }
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(fetchMyVouchers("token-member")).resolves.toEqual([
      {
        voucherCode: "MEM52026",
        title: "Voucher hoi vien",
        description: "Giam 180000 cho chang noi dia",
        discountAmount: 180000,
        currency: "VND",
        status: "AVAILABLE",
        expiresAt: "2026-05-31T16:59:59Z",
        usedAt: null,
        bookingCode: null
      }
    ]);
  });

  it("them passenger moi qua backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 301,
          fullName: "Tran Be Bong",
          passengerType: "child",
          dateOfBirth: "2015-09-14",
          documentType: "PASSPORT",
          documentNumber: "AB123456",
          isPrimary: false
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      createMyPassenger("token-789", {
        fullName: "Tran Be Bong",
        passengerType: "child",
        dateOfBirth: "2015-09-14",
        documentType: "PASSPORT",
        documentNumber: "AB123456",
        isPrimary: false
      })
    ).resolves.toMatchObject({
      id: 301,
      fullName: "Tran Be Bong"
    });
  });

  it("cap nhat passenger qua backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 301,
          fullName: "Tran Be Bong Moi",
          passengerType: "child",
          dateOfBirth: "2015-09-14",
          documentType: "PASSPORT",
          documentNumber: "AB123456",
          isPrimary: true
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      updateMyPassenger("token-111", 301, {
        fullName: "Tran Be Bong Moi",
        passengerType: "child",
        dateOfBirth: "2015-09-14",
        documentType: "PASSPORT",
        documentNumber: "AB123456",
        isPrimary: true
      })
    ).resolves.toMatchObject({
      id: 301,
      isPrimary: true
    });
  });

  it("xoa passenger qua backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204
      })
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(deleteMyPassenger("token-222", 301)).resolves.toBeUndefined();
  });
});
