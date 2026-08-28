import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const footerSource = readFileSync(
  new URL("../../src/components/site-footer.tsx", import.meta.url),
  "utf8"
);
const utilityIconsSource = readFileSync(
  new URL("../../src/components/utility-icons.tsx", import.meta.url),
  "utf8"
);

describe("kênh truyền thông ở chân trang", () => {
  it("dùng đúng liên kết TikTok và Zalo chính thức", () => {
    expect(footerSource).toContain('href: "https://www.tiktok.com/@vietnamairlines"');
    expect(footerSource).toContain('href: "https://zalo.me/3149253679280388721"');
  });

  it("hiển thị đầy đủ chữ Zalo trong biểu tượng", () => {
    expect(utilityIconsSource).toContain("M12.49 10.2722");
    expect(utilityIconsSource).toContain("M20.6934 9.6");
    expect(utilityIconsSource).not.toContain("M6 8h4.5l-4 5.5");
  });
});
