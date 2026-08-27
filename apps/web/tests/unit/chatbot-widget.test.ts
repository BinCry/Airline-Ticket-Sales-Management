import { describe, expect, it } from "vitest";

import {
  buildPendingLabel,
  resolveRequestMode
} from "@/components/chatbot-widget";

describe("chatbot-widget", () => {
  it("hien nhan cho thoi tiet khi cau hoi la thoi tiet", () => {
    expect(buildPendingLabel("travel", "Thời tiết ở Hải Phòng")).toBe(
      "AI đang kiểm tra thời tiết..."
    );
  });

  it("giu nhan cho goi y diem den voi cau hoi du lich", () => {
    expect(buildPendingLabel("travel", "Gợi ý đi biển cuối tuần")).toBe(
      "AI đang gợi ý điểm đến..."
    );
  });

  it("tu dong chuyen ve che do travel khi cau hoi la thoi tiet", () => {
    expect(resolveRequestMode("support", "Nhiệt độ ở Nha Trang")).toBe("travel");
  });
});
