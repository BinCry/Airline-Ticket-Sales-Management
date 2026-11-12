import { describe, expect, it } from "vitest";
import { maskPassengerDocumentNumber } from "@/lib/my-account-presentation";

describe("maskPassengerDocumentNumber", () => {
  it("chỉ hiển thị bốn ký tự cuối của giấy tờ", () => {
    expect(maskPassengerDocumentNumber("  079094000001  ")).toBe("••••••0001");
    expect(maskPassengerDocumentNumber("B12345003")).toBe("••••••5003");
  });

  it("không để lộ mã ngắn hoặc chuỗi trống", () => {
    expect(maskPassengerDocumentNumber("1234")).toBe("••••");
    expect(maskPassengerDocumentNumber("  ")).toBe("Chưa cập nhật");
  });
});
