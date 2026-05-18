import { describe, expect, it } from "vitest";

import {
  getPasswordChecklist,
  isPasswordPolicySatisfied
} from "@/lib/password-policy";

describe("password-policy", () => {
  it("chấp nhận mật khẩu đáp ứng đầy đủ tiêu chí", () => {
    expect(
      isPasswordPolicySatisfied("CanhSen#2026", [
        "khachhang@gmail.com",
        "0912345678"
      ])
    ).toBe(true);
  });

  it("chặn mật khẩu thiếu ký tự đặc biệt", () => {
    const rules = getPasswordChecklist("CanhSen2026", [
      "khachhang@gmail.com"
    ]);

    expect(rules.find((rule) => rule.id === "special")?.passed).toBe(false);
  });

  it("chặn mật khẩu chứa thông tin cá nhân", () => {
    expect(
      isPasswordPolicySatisfied("Khachhang#2026", [
        "khachhang@gmail.com"
      ])
    ).toBe(false);
  });

  it("chặn mật khẩu chứa chuỗi phổ biến", () => {
    expect(isPasswordPolicySatisfied("Password#2026")).toBe(false);
  });
});
