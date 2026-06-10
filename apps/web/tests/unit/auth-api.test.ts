import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGoogleOAuthLoginUrl,
  exchangeOAuthCode,
  loginWithPassword,
  requestForgotPasswordOtp,
  resetForgottenPassword,
  verifyForgotPasswordOtp
} from "@/lib/auth-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("auth-api", () => {
  it("dang nhap va nhan thong tin phien co permissions", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          tokenType: "Bearer",
          accessTokenExpiresAt: "2099-01-01T00:00:00Z",
          user: {
            id: 101,
            email: "khach@example.com",
            displayName: "Khach Hang",
            phone: "0909123456",
            emailVerified: true,
            roles: ["customer"],
            permissions: ["customer.self_service"]
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      loginWithPassword({
        email: "khach@example.com",
        password: "Matkhau@123"
      })
    ).resolves.toMatchObject({
      user: {
        roles: ["customer"],
        permissions: ["customer.self_service"]
      }
    });
  });

  it("goi api gui otp quen mat khau", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "accepted",
          message: "Neu email ton tai, ma OTP da duoc gui."
        }),
        {
          status: 202,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(requestForgotPasswordOtp("khach@example.com")).resolves.toMatchObject({
      status: "accepted"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/forgot-password/request-otp",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("tao url google oauth va doi ma tam thoi", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          tokenType: "Bearer",
          accessTokenExpiresAt: "2099-01-01T00:00:00Z",
          user: {
            id: 202,
            email: "google-oauth@oauth.local",
            displayName: "Khach Google",
            phone: null,
            avatarUrl: null,
            emailVerified: true,
            roles: ["customer"],
            permissions: ["customer.self_service"]
          }
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

    expect(buildGoogleOAuthLoginUrl("/account")).toBe(
      "http://localhost:8080/api/auth/oauth/google/start?redirectTo=%2Faccount"
    );

    await expect(exchangeOAuthCode("ma-tam")).resolves.toMatchObject({
      user: {
        displayName: "Khach Google"
      }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/oauth/exchange",
      expect.objectContaining({
        body: JSON.stringify({ code: "ma-tam" }),
        method: "POST"
      })
    );
  });

  it("goi api xac minh otp quen mat khau", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          verified: true,
          message: "OTP hop le."
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      verifyForgotPasswordOtp("khach@example.com", "123456")
    ).resolves.toMatchObject({
      verified: true
    });
  });

  it("goi api dat lai mat khau", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204
      })
    ) as typeof fetch;

    await expect(
      resetForgottenPassword("khach@example.com", "123456", "Matkhau@123")
    ).resolves.toBeUndefined();
  });
});
