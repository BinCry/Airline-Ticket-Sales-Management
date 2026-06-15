import { describe, expect, it } from "vitest";

import {
  appendBackofficeSalesFlow,
  createBackofficeSalesLookupHref,
  createBackofficeSalesSearchHref,
  hasBackofficeSalesFlow,
  isBackofficeSalesFlowValue
} from "@/lib/backoffice-sales-flow";

describe("backoffice-sales-flow", () => {
  it("nhan dien dung co backoffice sales trong query", () => {
    expect(isBackofficeSalesFlowValue("1")).toBe(true);
    expect(isBackofficeSalesFlowValue("0")).toBe(false);
    expect(isBackofficeSalesFlowValue(null)).toBe(false);
  });

  it("doc co backoffice sales tu search params dang record", () => {
    expect(hasBackofficeSalesFlow({ backofficeSales: "1" })).toBe(true);
    expect(hasBackofficeSalesFlow({ backofficeSales: ["1", "0"] })).toBe(true);
    expect(hasBackofficeSalesFlow({})).toBe(false);
  });

  it("gan co backoffice sales vao url co san query va hash", () => {
    expect(appendBackofficeSalesFlow("/search?from=SGN#dat-ve")).toBe(
      "/search?from=SGN&backofficeSales=1#dat-ve"
    );
  });

  it("tao duong dan chuan cho search va tra cuu booking noi bo", () => {
    expect(createBackofficeSalesSearchHref()).toBe("/search?backofficeSales=1#dat-ve");
    expect(createBackofficeSalesLookupHref("a6c2p1", "KHACH.HANG@GMAIL.COM")).toBe(
      "/backoffice/sales?bookingCode=A6C2P1&email=khach.hang%40gmail.com"
    );
  });
});
