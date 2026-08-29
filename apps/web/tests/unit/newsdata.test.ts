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

    expect(articles).toHaveLength(0);
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

    expect(articles).toHaveLength(0);
  });

  it("loai bai lifestyle khong lien quan den du lich", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              category: ["lifestyle"],
              description:
                "Các nhà sách, trường học và giáo viên đang triển khai giải pháp đáp ứng nhu cầu sách giáo khoa.",
              image_url: "https://newsdata.invalid/sach-giao-khoa.jpg",
              link: "https://nhandan.vn/giai-phap-sach-giao-khoa-post123456.html",
              pubDate: "2026-08-28 10:42:00",
              source_id: "nhandan",
              source_name: "Báo Nhân Dân điện tử",
              title: "Cần Thơ chủ động kết nối, linh hoạt các giải pháp sách giáo khoa"
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

    const articles = await getTravelArticles(1, true);

    expect(articles).toHaveLength(0);
  });

  it("loai bai chi nhac den du lich trong ngu canh doi song khac", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              category: ["lifestyle"],
              description: "Người bệnh cần ưu tiên rau xanh và thực phẩm ít chất béo khi đi du lịch.",
              image_url: "https://newsdata.invalid/suc-khoe.jpg",
              link: "https://vnexpress.net/bi-trao-nguoc-da-day-nen-an-uong-the-nao-khi-di-du-lich-1234567.html",
              pubDate: "2026-08-29 10:42:00",
              source_id: "vnexpress",
              source_name: "VnExpress",
              title: "Bị trào ngược dạ dày nên ăn uống thế nào khi đi du lịch"
            },
            {
              category: ["lifestyle"],
              description: "Câu chuyện khác biệt trong cách nhìn về tiền bạc sau chuyến đi.",
              image_url: "https://newsdata.invalid/tinh-cam.jpg",
              link: "https://tintuc24h.vn/chia-tay-ban-trai-vi-di-du-lich-hay-mac-ca-1234567.html",
              pubDate: "2026-08-29 10:41:00",
              source_id: "tintuc24h",
              source_name: "Tin tức 24h",
              title: "Chia tay bạn trai vì đi du lịch hay mặc cả"
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

    expect(articles).toHaveLength(0);
  });

  it("loai lai bai khi metadata goc thay tieu de du lich bang noi dung ngoai le", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                category: ["lifestyle"],
                description: "Tin du lịch và điểm đến mới nhất.",
                image_url: "https://newsdata.invalid/du-lich.jpg",
                link: "https://nhandan.vn/bai-viet-post123456.html",
                pubDate: "2026-08-28 10:42:00",
                source_id: "nhandan",
                source_name: "Báo Nhân Dân điện tử",
                title: "Xu hướng du lịch dịp nghỉ lễ Quốc khánh"
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
                <meta property="og:title" content="Khắc phục triệt để tình trạng hồ sơ giải quyết chậm" />
                <meta property="og:description" content="Cơ quan chức năng yêu cầu bổ sung hồ sơ nhiều lần." />
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

    expect(articles).toHaveLength(0);
  });

  it("phan trang de lay du bai live truoc khi dung fallback", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    const liveArticles = Array.from({ length: 9 }, (_, index) => ({
      category: ["lifestyle"],
      description: "Tin du lịch mới nhất.",
      image_url: `https://newsdata.invalid/du-lich-${index}.jpg`,
      link: `https://tuoitre.vn/kinh-nghiem-du-lich-${index}.htm`,
      pubDate: `2026-08-28 10:${String(42 - index).padStart(2, "0")}:00`,
      source_id: "tuoitre",
      source_name: "Tuổi Trẻ Online",
      title: `Kinh nghiệm hành trình du lịch mới ${index + 1}`
    }));

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("tuoitre.vn")) {
        return Promise.resolve(
          new Response("forbidden", {
            headers: {
              "Content-Type": "text/html; charset=utf-8"
            },
            status: 403
          })
        );
      }

      const isNextPage = url.includes("page=next-page");

      return Promise.resolve(
        new Response(
          JSON.stringify({
            nextPage: isNextPage ? null : "next-page",
            results: isNextPage ? liveArticles.slice(5) : liveArticles.slice(0, 5),
            status: "success"
          }),
          {
            headers: {
              "Content-Type": "application/json"
            },
            status: 200
          }
        )
      );
    }) as typeof fetch;

    const articles = await getTravelArticles(9, false);

    expect(articles).toHaveLength(9);
    expect(articles.every((article) => article.external)).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("page=next-page"),
      expect.any(Object)
    );
  });

  it("gioi han moi nhom chu de mot bai de tranh lap noi dung", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    const results = [
      "MICE 1",
      "MICE 2",
      "MICE 3",
      "MICE 4",
      "Du lịch Phú Quốc mùa nắng",
      "Hành lý du lịch cần biết"
    ].map((title, index) => ({
      category: ["lifestyle"],
      description: "Tin du lịch mới nhất.",
      image_url: `https://newsdata.invalid/article-${index}.jpg`,
      link: `https://tuoitre.vn/article-${index}.htm`,
      pubDate: `2026-08-28 10:${String(42 - index).padStart(2, "0")}:00`,
      source_id: "tuoitre",
      source_name: "Tuổi Trẻ Online",
      title: title.includes("MICE") ? `Du lịch MICE ${index + 1}` : title
    }));

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("tuoitre.vn")) {
        return Promise.resolve(new Response("forbidden", { status: 403 }));
      }

      return Promise.resolve(
        new Response(JSON.stringify({ results, status: "success" }), {
          headers: {
            "Content-Type": "application/json"
          },
          status: 200
        })
      );
    }) as typeof fetch;

    const articles = await getTravelArticles(4, false);
    const miceArticles = articles.filter((article) =>
      article.title.toLowerCase().includes("mice")
    );

    expect(articles).toHaveLength(3);
    expect(miceArticles).toHaveLength(1);
    expect(articles.some((article) => article.title.includes("Phú Quốc"))).toBe(true);
    expect(articles.some((article) => article.title.includes("Hành lý"))).toBe(true);
  });

  it("chi dung fallback khi API that bai", async () => {
    vi.stubEnv("NEWSDATA_API_KEY", "newsdata-test-key");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response("service unavailable", {
        status: 503
      })
    ) as typeof fetch;

    const articles = await getTravelArticles(10, true);

    expect(articles).toHaveLength(10);
    expect(articles.every((article) => !article.external)).toBe(true);
  });
});
