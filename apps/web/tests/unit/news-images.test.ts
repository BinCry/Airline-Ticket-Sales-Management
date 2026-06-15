import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/news-image/route";
import {
  buildNewsImageProxyUrl,
  NEWS_IMAGE_FALLBACK_PATH,
  rewriteNewsImageUrl
} from "@/lib/news-images";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("news-images", () => {
  it("giu nguyen anh local", () => {
    expect(rewriteNewsImageUrl("/images/danang-coast.jpg")).toBe("/images/danang-coast.jpg");
  });

  it("rewrite anh external hop le sang proxy noi bo", () => {
    const sourceUrl = "https://cdnphoto.dantri.com.vn/du-lich/anh.jpg";

    expect(rewriteNewsImageUrl(sourceUrl)).toBe(buildNewsImageProxyUrl(sourceUrl));
  });

  it("dua host ngoai allowlist ve anh du phong", () => {
    expect(rewriteNewsImageUrl("https://example.com/du-lich/anh.jpg")).toBe(
      NEWS_IMAGE_FALLBACK_PATH
    );
  });
});

describe("news-image route", () => {
  it("proxy anh hop le va giu content-type anh", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=120",
        "Content-Type": "image/webp"
      }
    })) as typeof fetch;

    const response = await GET(
      new NextRequest(
        "http://127.0.0.1:3000/api/news-image?src="
        + encodeURIComponent("https://cdnphoto.dantri.com.vn/du-lich/anh.webp")
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=120");

    const body = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(body)).toEqual([1, 2, 3]);
  });

  it("tra anh du phong khi host khong hop le", async () => {
    global.fetch = vi.fn();

    const response = await GET(
      new NextRequest(
        "http://127.0.0.1:3000/api/news-image?src="
        + encodeURIComponent("https://example.com/du-lich/anh.jpg")
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("tra anh du phong khi upstream bao loi", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("forbidden", {
      status: 403
    })) as typeof fetch;

    const response = await GET(
      new NextRequest(
        "http://127.0.0.1:3000/api/news-image?src="
        + encodeURIComponent("https://cdnphoto.dantri.com.vn/du-lich/anh.jpg")
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });
});
