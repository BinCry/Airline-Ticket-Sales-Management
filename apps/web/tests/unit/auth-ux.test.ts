import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ForgotPasswordPage from "@/app/forgot-password/page";

describe("bố cục khôi phục mật khẩu", () => {
  it("hiển thị tiến trình thành danh sách có bước hiện tại riêng biệt", () => {
    const html = renderToStaticMarkup(createElement(ForgotPasswordPage));

    expect(html).toContain('<ol class="auth-progress" aria-label="Tiến trình quên mật khẩu">');
    expect(html.match(/class="auth-progress-step /g)).toHaveLength(4);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("<strong>1</strong><span>Nhập email</span>");
  });
});
