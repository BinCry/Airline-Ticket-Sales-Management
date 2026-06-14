import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { AuthSession } from "@/lib/auth-session";
import {
  buildCopilotRuntimeHeaders,
  shouldShowBookingCopilotSidebar
} from "@/lib/copilot-booking";

function createAuthSession(): AuthSession {
  return {
    accessToken: "access-token-mau",
    refreshToken: "refresh-token-mau",
    tokenType: "Bearer",
    accessTokenExpiresAt: "2099-01-01T00:00:00Z",
    user: {
      id: 151,
      email: "hoi-vien@example.com",
      displayName: "Hoi Vien",
      phone: null,
      avatarUrl: null,
      emailVerified: true,
      roles: ["member"],
      permissions: ["customer.self_service", "member.loyalty"]
    }
  };
}

describe("copilot-booking", () => {
  it("gui Authorization khi nguoi dung da dang nhap", () => {
    expect(buildCopilotRuntimeHeaders(createAuthSession())).toEqual({
      Authorization: "Bearer access-token-mau"
    });
  });

  it("chay guest mode khi chua co token", () => {
    expect(buildCopilotRuntimeHeaders(null)).toEqual({});
  });

  it("chi bat sidebar tren trang booking va checkout", () => {
    expect(shouldShowBookingCopilotSidebar("/booking")).toBe(true);
    expect(shouldShowBookingCopilotSidebar("/booking/A6C2P1/checkout")).toBe(
      true
    );
    expect(shouldShowBookingCopilotSidebar("/search")).toBe(false);
    expect(shouldShowBookingCopilotSidebar("/booking/A6C2P1")).toBe(false);
  });

  it("giu ChatbotWidget cu va them BookingCopilotSidebar trong layout", () => {
    const layoutSource = readFileSync(
      new URL("../../src/app/layout.tsx", import.meta.url),
      "utf8"
    );

    expect(layoutSource).toContain("ChatbotWidget");
    expect(layoutSource).toContain("BookingCopilotSidebar");
    expect(layoutSource).toContain("CopilotProvider");
  });
});
