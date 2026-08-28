import { afterEach, describe, expect, it, vi } from "vitest";

import { getTravelArticles } from "@/lib/newsdata";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("newsdata", () => {
  it("uu tien metadata cua bai goc khi title va source tu NewsData bi lech", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                category: ["lifestyle"],
                description: "Tin du lịch mới nhất tại TP.HCM.",
                image_url: "https://newsdata.invalid/du-lich.jpg",
                link: "https://tuoitre.vn/chinh-thuc-khai-mac-hoi-cho-du-lich-quoc-te-tphcm-ite-hcmc-2026-100260827094910411.htm",
                pubDate: "2026-08-27 10:42:00",
                source_id: "tuoitre",
                source_name: "Báo Người Lao Động",
                title: "hình thức khai mạc Hội chợ Du lịch Quốc tế TP.HCM ITE HCMC 2026"
              }
            ],
            status: "success"
          }),
          {
            headers: {
              "Content-Type": "application/json"
            },
            status: 200
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Chính thức khai mạc Hội chợ Du lịch Quốc tế TP.HCM ITE HCMC 2026" />
                <meta property="og:description" content="Bài gốc đã chuẩn hóa đầy đủ tiêu đề và mô tả." />
                <meta property="og:image" content="https://cdn2.tuoitre.vn/zoom/1200_630/anh-bia.jpg" />
                <meta property="og:site_name" content="Tuổi Trẻ Online" />
              </head>
            </html>
          `,
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8"
            },
            status: 200
          }
        )
      ) as typeof fetch;

    const articles = await getTravelArticles(1, true);

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      title: "Chính thức khai mạc Hội chợ Du lịch Quốc tế TP.HCM ITE HCMC 2026",
      source: "Tuổi Trẻ Online",
      summary: "Bài gốc đã chuẩn hóa đầy đủ tiêu đề và mô tả.",
      image: "https://cdn2.tuoitre.vn/zoom/1200_630/anh-bia.jpg",
      href: "https://tuoitre.vn/chinh-thuc-khai-mac-hoi-cho-du-lich-quoc-te-tphcm-ite-hcmc-2026-100260827094910411.htm",
      external: true
    });
  });

  it("tu suy ra title va source tu url khi bai goc chan metadata", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                category: ["lifestyle"],
                description: "Tin du lịch nổi bật.",
                image_url: "https://cdn.petrotimes.vn/du-lich/anh-bia.jpg",
                link: "https://tuoitre.vn/chinh-thuc-khai-mac-hoi-cho-du-lich-quoc-te-tphcm-ite-hcmc-2026-100260827094910411.htm",
                pubDate: "2026-08-27 10:42:00",
                source_id: "tuoitre",
                source_name: "Báo Người Lao Động",
                title: "hình thức khai mạc Hội chợ Du lịch Quốc tế TP.HCM ITE HCMC 2026"
              }
            ],
            status: "success"
          }),
          {
            headers: {
              "Content-Type": "application/json"
            },
            status: 200
          }
        )
      )
      .mockResolvedValueOnce(
        new Response("forbidden", {
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          },
          status: 403
        })
      ) as typeof fetch;

    const articles = await getTravelArticles(1, true);

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      title: "Chinh Thuc Khai Mac Hoi Cho Du Lich Quoc Te TP.HCM ITE HCMC 2026",
      source: "Tuoitre",
      summary: "Tin du lịch nổi bật.",
      image: "https://cdn.petrotimes.vn/du-lich/anh-bia.jpg",
      href: "https://tuoitre.vn/chinh-thuc-khai-mac-hoi-cho-du-lich-quoc-te-tphcm-ite-hcmc-2026-100260827094910411.htm",
      external: true
    });
  });

  it("luon loai bo nguon tin bi chan ke ca khi bat includeSecondarySources", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              category: ["lifestyle"],
              description: "Tin du lịch khám phá điểm đến.",
              image_url: "https://newsdata.invalid/du-lich.jpg",
              link: "https://kenh14.vn/du-lich-phu-quoc.chn",
              pubDate: "2026-08-27 10:42:00",
              source_id: "kenh14",
              source_name: "Kênh 14",
              title: "Khám phá Phú Quốc mùa hè"
            },
            {
              category: ["lifestyle"],
              description: "Tin du lịch và nghỉ dưỡng.",
              image_url: "https://newsdata.invalid/soha.jpg",
              link: "https://soha.vn/du-lich-nha-trang.chn",
              pubDate: "2026-08-27 10:40:00",
              source_id: "soha",
              source_name: "Soha",
              title: "Cẩm nang du lịch Nha Trang"
            }
          ],
          status: "success"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 200
        }
      )
    ) as typeof fetch;

    const articles = await getTravelArticles(2, true);

    // Vì tất cả bài báo từ nguồn bị chặn nên sẽ rơi vào danh sách fallback mặc định
    expect(articles).toHaveLength(2);
    expect(articles[0].external).toBe(false);
  });

  it("loai bo bai viet chua tu khoa tieu cuc hoac khong phu hop", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              category: ["lifestyle"],
              description: "Tai nạn giao thông nghiêm trọng trên đường đi du lịch.",
              image_url: "https://newsdata.invalid/tai-nan.jpg",
              link: "https://tuoitre.vn/tai-nan-tren-duong-di-du-lich.htm",
              pubDate: "2026-08-27 10:42:00",
              source_id: "tuoitre",
              source_name: "Tuổi Trẻ Online",
              title: "Vụ án hình sự liên quan xe khách du lịch"
            }
          ],
          status: "success"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 200
        }
      )
    ) as typeof fetch;

    const articles = await getTravelArticles(1, false);

    expect(articles).toHaveLength(1);
    expect(articles[0].external).toBe(false);
  });
});
