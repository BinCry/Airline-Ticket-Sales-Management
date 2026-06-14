import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCopilotPrompt,
  createFallbackCopilotContext,
  fetchCopilotContext,
  getCopilotModel
} from "@/lib/copilot-runtime";

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("copilot-runtime", () => {
  it("chuan hoa ten model gemini ve dinh dang provider/model", () => {
    process.env.COPILOTKIT_MODEL = "gemini-2.5-flash";

    expect(getCopilotModel()).toBe("google/gemini-2.5-flash");
  });

  it("tra ve guest context khi goi backend that bai", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("mat ket noi")) as typeof fetch;

    await expect(fetchCopilotContext("Bearer abc")).resolves.toEqual(
      createFallbackCopilotContext()
    );
  });

  it("xay dung prompt co du pham vi va thong diep xung dot ghe", () => {
    const prompt = buildCopilotPrompt({
      authMode: "authenticated",
      user: {
        id: 151,
        email: "hoi-vien@example.com",
        displayName: "Hoi Vien"
      },
      roles: ["member"],
      permissions: ["customer.self_service", "member.loyalty"],
      allowedAgentScopes: [
        "booking.public_search",
        "booking.seat_map_readonly",
        "booking.payment_guidance",
        "booking.manage_own_booking",
        "booking.member_voucher_guidance"
      ],
      bookingRules: {
        holdMinutes: 15,
        paymentProvider: "sepay",
        supportsGuestBooking: true,
        supportsQrCode: true,
        requiresUserPaymentConfirmation: true,
        seatConflictMessage: "Ghế này đã có người khác chọn"
      }
    });

    expect(prompt).toContain("authenticated");
    expect(prompt).toContain("booking.manage_own_booking");
    expect(prompt).toContain("Ghế này đã có người khác chọn");
  });
});
