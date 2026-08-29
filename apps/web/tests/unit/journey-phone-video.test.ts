import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const componentSource = readFileSync(
  new URL("../../src/components/journey-phone-video.tsx", import.meta.url),
  "utf8"
);
const homePageSource = readFileSync(
  new URL("../../src/app/page.tsx", import.meta.url),
  "utf8"
);

describe("video trong khung điện thoại", () => {
  it("tự phát lặp lại mà không dùng ảnh thay thế", () => {
    expect(componentSource).toContain("autoPlay");
    expect(componentSource).toContain("loop");
    expect(componentSource).toContain('preload="auto"');
    expect(componentSource).toContain("playsInline");
    expect(componentSource).toContain("muted={isMuted}");
    expect(componentSource).not.toContain("poster=");
  });

  it("chỉ giữ nút điều khiển âm thanh trên video", () => {
    expect(componentSource.match(/<button/g)).toHaveLength(1);
    expect(componentSource).toContain('className="journey-phone-mute"');
    expect(componentSource).not.toContain("journey-phone-play");
    expect(componentSource).not.toContain("journey-phone-label");
    expect(componentSource).not.toContain("journey-phone-caption");
    expect(componentSource).not.toContain("journey-phone-overlay");
  });

  it("hiển thị Dynamic Island và tăng sáng video", () => {
    expect(homePageSource).toContain('className="journey-phone-island"');
    expect(homePageSource).toContain("filter: brightness(1.08)");
    expect(homePageSource).not.toContain("journey-phone-speaker");
  });
});
