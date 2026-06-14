import { describe, expect, it } from "vitest";

import { promotions } from "@/lib/public-content";

describe("public-content", () => {
  it("gắn đúng đường dẫn cho ba CTA trang chủ", () => {
    expect(promotions.map(({ cta, href }) => ({ cta, href }))).toEqual([
      { cta: "Xem hướng dẫn", href: "/support#luu-y" },
      { cta: "Mở tài khoản", href: "/register" },
      { cta: "Mở trung tâm hỗ trợ", href: "/support" }
    ]);
  });
});
