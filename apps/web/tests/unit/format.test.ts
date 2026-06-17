import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateInputValue,
  formatDateTime,
  isIsoDateWithinRange,
  normalizeDateInputDisplayValue,
  parseDateInputDisplayValue
} from "@/lib/format";

describe("format", () => {
  it("dinh dang ngay iso theo kieu ngay thang nam", () => {
    expect(formatDate("2026-06-17")).toBe("17/06/2026");
    expect(formatDateInputValue("2026-06-17")).toBe("17/06/2026");
  });

  it("dinh dang ngay gio theo mui gio viet nam", () => {
    const formatted = formatDateTime("2026-06-17T12:45:00+07:00");

    expect(formatted).toContain("17/06/2026");
    expect(formatted).toContain("12:45");
  });

  it("chuan hoa du lieu nhap tay cho o ngay", () => {
    expect(normalizeDateInputDisplayValue("17062026")).toBe("17/06/2026");
    expect(parseDateInputDisplayValue("17/06/2026")).toBe("2026-06-17");
    expect(parseDateInputDisplayValue("17/06/26")).toBe("2026-06-17");
  });

  it("kiem tra gioi han ngay iso", () => {
    expect(isIsoDateWithinRange("2026-06-17", "2026-06-01", "2026-06-30")).toBe(true);
    expect(isIsoDateWithinRange("2026-07-01", "2026-06-01", "2026-06-30")).toBe(false);
  });
});
