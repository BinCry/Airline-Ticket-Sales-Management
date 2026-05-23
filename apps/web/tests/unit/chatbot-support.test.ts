import { describe, expect, it } from "vitest";

import { buildSupportReply } from "@/lib/chatbot-support";
import type { ChatbotApiMessage } from "@/lib/chatbot-shared";

function ask(content: string) {
  const messages: ChatbotApiMessage[] = [{ content, role: "user" }];

  return buildSupportReply(messages);
}

function actionLinks(content: string) {
  return ask(content).actions?.map((action) => action.href) ?? [];
}

describe("chatbot-support", () => {
  it("tra loi cau hoi tim chuyen bay bang link search", () => {
    const response = ask("Tôi muốn tìm chuyến bay khứ hồi cho 2 hành khách");

    expect(response.reply).toContain("tìm chuyến bay");
    expect(actionLinks("Tôi muốn tìm chuyến bay khứ hồi cho 2 hành khách")).toContain("/search");
  });

  it("tra loi cau hoi dat ve chon ghe va hang ve", () => {
    const response = ask("Tôi đặt vé rồi muốn chọn hạng vé và chọn ghế");

    expect(response.reply).toContain("chọn hạng vé");
    expect(response.reply).toContain("chọn ghế");
    expect(response.actions?.some((action) => action.href === "/booking" || action.href === "/search")).toBe(true);
  });

  it("tra loi loi thanh toan va tranh giao dich trung", () => {
    const response = ask("Thanh toán bị treo, tôi có nên thanh toán lại không để tránh giao dịch trùng?");

    expect(response.reply).toContain("giao dịch trùng");
    expect(actionLinks("Thanh toán bị treo, tôi có nên thanh toán lại không?")).toContain("/manage-booking");
  });

  it("tra loi pnr va quan ly dat cho", () => {
    const response = ask("Làm sao tra cứu PNR và xem hành trình của tôi?");

    expect(response.reply).toContain("mã đặt chỗ");
    expect(actionLinks("Làm sao tra cứu PNR và xem hành trình của tôi?")).toContain("/manage-booking");
  });

  it("tra loi check-in otp va boarding pass", () => {
    const response = ask("Check-in cần OTP hay lookup token để lấy boarding pass?");

    expect(response.reply).toContain("OTP");
    expect(actionLinks("Check-in cần OTP hay lookup token để lấy boarding pass?")).toContain("/check-in");
  });

  it("tra loi tinh trang chuyen bay", () => {
    const response = ask("Chuyến bay bị delay thì kiểm tra tình trạng chuyến bay ở đâu?");

    expect(response.reply).toContain("tình trạng chuyến bay");
    expect(actionLinks("Chuyến bay bị delay thì kiểm tra tình trạng chuyến bay ở đâu?")).toContain("/flight-status");
  });

  it("tra loi tai khoan va quen mat khau", () => {
    const response = ask("Tôi quên mật khẩu tài khoản thì làm sao?");

    expect(response.reply).toContain("quên mật khẩu");
    expect(actionLinks("Tôi quên mật khẩu tài khoản thì làm sao?")).toContain("/forgot-password");
  });

  it("tra loi fallback co tong dai va email khi khong khop", () => {
    const response = ask("abc xyz qwerty");

    expect(response.reply).toContain("1900 6868");
    expect(response.reply).toContain("support@vietnam-airlines.vn");
    expect(actionLinks("abc xyz qwerty")).toContain("/support");
  });

  it("uu tien cau hoi moi nhat cua nguoi dung thay vi loi chao cua bot", () => {
    const response = buildSupportReply([
      {
        content:
          "Xin chào, bạn có thể hỏi về tìm chuyến, đặt vé, thanh toán, tra cứu mã đặt chỗ, check-in, hạng vé, hành lý hoặc tài khoản.",
        role: "assistant"
      },
      {
        content: "abc xyz qwerty",
        role: "user"
      }
    ]);

    expect(response.reply).toContain("1900 6868");
    expect(response.actions?.map((action) => action.href)).toContain("/support");
  });

  it("khong de cau tra loi cu lam lech chu de cau hoi moi", () => {
    const response = buildSupportReply([
      {
        content: "Tôi muốn tra cứu mã đặt chỗ",
        role: "user"
      },
      {
        content: "Để tra cứu đặt chỗ, bạn cần mã đặt chỗ và họ tên hành khách.",
        role: "assistant"
      },
      {
        content: "Tôi quên mật khẩu tài khoản",
        role: "user"
      }
    ]);

    expect(response.reply).toContain("quên mật khẩu");
    expect(response.actions?.map((action) => action.href)).toContain("/forgot-password");
  });
});
