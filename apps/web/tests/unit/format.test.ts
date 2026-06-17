import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "@/lib/format";

describe("format", () => {
  it("dinh dang ngay dang yyyy-MM-dd theo dd/MM/yyyy", () => {
    expect(formatDate("1995-05-12")).toBe("12/05/1995");
  });

  it("dinh dang ngay gio theo kieu viet nam", () => {
    expect(formatDateTime("2026-06-15T08:30:00+07:00")).toBe("15/06/2026 08:30");
  });

  it("giu fallback khi gia tri rong", () => {
    expect(formatDate(null)).toBe("Không có dữ liệu");
    expect(formatDateTime(undefined)).toBe("Không có dữ liệu");
  });
});
