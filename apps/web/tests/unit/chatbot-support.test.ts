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

  it("hieu cau viet tat ve mat khau va tai khoan", () => {
    const response = ask("Tôi quên mk tk thì làm sao đăng nhập lại?");

    expect(response.reply).toContain("quên mật khẩu");
    expect(actionLinks("Tôi quên mk tk thì làm sao đăng nhập lại?")).toContain("/forgot-password");
  });

  it("tra loi otp tra cuu booking cho khach chua dang nhap", () => {
    const response = ask("Tôi không nhận được OTP tra cứu đặt chỗ bằng email liên hệ");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("Không nhận được OTP tra cứu");
    expect(actionLinks("Tôi không nhận được OTP tra cứu đặt chỗ bằng email liên hệ")).toContain("/manage-booking");
  });

  it("hieu cau otp tra cuu bi viet tat va thieu chu", () => {
    const response = ask("Tôi ko nhan dc otp tra cu dat cho");

    expect(response.reply).toContain("OTP tra cứu");
    expect(response.reply).toContain("yêu cầu mã mới");
    expect(actionLinks("Tôi ko nhan dc otp tra cu dat cho")).toContain("/manage-booking");
  });

  it("tra loi truc tiep cau hoi faq ve otp", () => {
    const response = ask("Không nhận được OTP tra cứu thì xử lý thế nào?");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("Không nhận được OTP tra cứu");
    expect(response.reply).toContain("yêu cầu mã mới");
    expect(actionLinks("Không nhận được OTP tra cứu thì xử lý thế nào?")).toContain("/support#faq");
  });

  it("tra loi hoan ve va huy dat cho", () => {
    const response = ask("Tôi muốn hoàn vé, hủy đặt chỗ và kiểm tra trạng thái hoàn tiền");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("Tôi muốn hoàn vé hoặc hủy đặt chỗ");
    expect(response.reply).toContain("yêu cầu hoàn/hủy");
    expect(actionLinks("Tôi muốn hoàn vé, hủy đặt chỗ và kiểm tra trạng thái hoàn tiền")).toContain("/manage-booking");
  });

  it("hieu cau hoan ve bi go sai nhe", () => {
    const response = ask("Toi muon hoang ve va huy dat cho");

    expect(response.reply).toContain("Hoàn vé hoặc hủy đặt chỗ");
    expect(actionLinks("Toi muon hoang ve va huy dat cho")).toContain("/manage-booking");
  });

  it("tra loi email ve va hoa don", () => {
    const response = ask("Tôi đã thanh toán nhưng chưa nhận được email vé điện tử và cần xuất hóa đơn");

    expect(response.reply).toContain("vé điện tử");
    expect(response.reply).toContain("hóa đơn");
    expect(actionLinks("Tôi đã thanh toán nhưng chưa nhận được email vé điện tử và cần xuất hóa đơn")).toContain("/manage-booking");
  });

  it("tra loi truc tiep cau hoi faq ve voucher", () => {
    const response = ask("Vì sao mã giảm giá hoặc voucher không dùng được?");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("mã giảm giá hoặc voucher");
    expect(response.reply).toContain("điều kiện áp dụng");
    expect(actionLinks("Vì sao mã giảm giá hoặc voucher không dùng được?")).toContain("/support#faq");
  });

  it("tra loi voucher va uu dai hoi vien", () => {
    const response = ask("Voucher của tôi không dùng được mã giảm giá khi áp dụng ưu đãi hội viên");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("mã giảm giá hoặc voucher");
    expect(actionLinks("Voucher của tôi không dùng được mã giảm giá khi áp dụng ưu đãi hội viên")).toContain("/account");
  });

  it("hieu cau voucher bi go sai va viet tat", () => {
    const response = ask("Vaucher cua toi ko dung dc ma giam gia");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("điều kiện áp dụng");
    expect(actionLinks("Vaucher cua toi ko dung dc ma giam gia")).toContain("/account");
  });

  it("tra loi thong tin hanh khach va giay to", () => {
    const response = ask("Tôi nhập sai tên hành khách, ngày sinh và số CCCD thì sửa thế nào?");

    expect(response.reply).toContain("Thông tin hành khách");
    expect(response.reply).toContain("giấy tờ");
    expect(actionLinks("Tôi nhập sai tên hành khách, ngày sinh và số CCCD thì sửa thế nào?")).toContain("/booking");
  });

  it("tra loi chon ghe bi trung", () => {
    const response = ask("Ghế tôi chọn bị trùng, sơ đồ ghế báo không khả dụng");

    expect(response.reply).toContain("ghế đã được người khác giữ");
    expect(actionLinks("Ghế tôi chọn bị trùng, sơ đồ ghế báo không khả dụng")).toContain("/booking");
  });

  it("tra loi dich vu bo tro va suat an", () => {
    const response = ask("Tôi muốn mua thêm suất ăn và hành lý Bag_23 sau khi đặt vé");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("mua thêm hành lý");
    expect(actionLinks("Tôi muốn mua thêm suất ăn và hành lý Bag_23 sau khi đặt vé")).toContain("/manage-booking");
  });

  it("hieu cau thanh toan viet tat va go sai thu tu chu", () => {
    const response = ask("TT bi loi, da tru tien nhung booking chua cap nhat thanh taon");

    expect(response.reply).toContain("Mình tìm thấy");
    expect(response.reply).toContain("thanh toán");
    expect(actionLinks("TT bi loi, da tru tien nhung booking chua cap nhat thanh taon")).toContain("/manage-booking");
  });

  it("tra loi ho tro dac biet tai san bay", () => {
    const response = ask("Gia đình tôi cần xe lăn và hỗ trợ đặc biệt tại sân bay");

    expect(response.reply).toContain("hỗ trợ đặc biệt");
    expect(actionLinks("Gia đình tôi cần xe lăn và hỗ trợ đặc biệt tại sân bay")).toContain("/support");
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
