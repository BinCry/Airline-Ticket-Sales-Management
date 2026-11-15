import { describe, expect, it } from "vitest";

import { layDuongDanNoiBoAnToan, resolveSafeRedirectTarget } from "@/lib/safe-redirect";

describe("safe-redirect", () => {
  it("giu nguyen duong dan noi bo hop le", () => {
    expect(resolveSafeRedirectTarget("/account")).toBe("/account");
    expect(resolveSafeRedirectTarget("/backoffice/audit?tab=1#top")).toBe("/backoffice/audit?tab=1#top");
  });

  it("chan duong dan tro ra ngoai website", () => {
    for (const giaTri of [
      "//example.org",
      "/\\example.org",
      "/\\/example.org",
      "\\\\example.org",
      "https://example.org",
      "/\texample.org",
      "javascript:alert(1)",
      "example.org"
    ]) {
      expect(layDuongDanNoiBoAnToan(giaTri)).toBeNull();
      expect(resolveSafeRedirectTarget(giaTri)).toBe("/");
    }
  });

  it("dung gia tri mac dinh khi rong", () => {
    expect(resolveSafeRedirectTarget(null)).toBe("/");
    expect(resolveSafeRedirectTarget("  ", "/account")).toBe("/account");
  });
});
