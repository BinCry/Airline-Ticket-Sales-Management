import Image from "next/image";

import { getBlogTravelArticles } from "@/lib/newsdata";
import { SectionHeading } from "@/components/section-heading";
import { promotions } from "@/lib/public-content";

const BLOG_ARTICLE_LIMIT = 12;

const promotionPhotos = [
  {
    src: "/images/summer-promo.jpg",
    alt: "Hình minh họa chiến dịch mùa hè"
  },
  {
    src: "/images/member-promo-v2.png",
    alt: "Hình minh họa hội viên Vietnam Airlines"
  },
  {
    src: "/images/business-promo.jpg",
    alt: "Hình minh họa doanh nghiệp với dữ liệu tài chính"
  }
] as const;

export const revalidate = 0;

export default async function BlogPage() {
  const travelArticles = await getBlogTravelArticles(BLOG_ARTICLE_LIMIT);

  return (
    <section className="section">
      <div className="container">
        <div id="bai-viet" />
        <SectionHeading
          eyebrow="Tin du lịch mới"
          title="Cẩm nang và tin du lịch mới"
          description="Các gợi ý mới nhất về điểm đến, trải nghiệm và hành trình bay."
          level={1}
        />
        <div className="card-grid card-grid-3 travel-news-grid">
          {travelArticles.map((article) => (
            <a
              key={`${article.href}-${article.title}`}
              href={article.href}
              className="surface-card article-card travel-news-card"
              rel={article.external ? "noreferrer" : undefined}
              target={article.external ? "_blank" : undefined}
            >
              <div className="travel-news-card-media">
                <img
                  src={article.image}
                  alt={article.title}
                  width={640}
                  height={410}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="travel-news-card-copy">
                <span className="pill">{article.source}</span>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
                <small>{article.readTime}</small>
              </div>
            </a>
          ))}
        </div>

        <div className="section-gap" />
        <SectionHeading
          eyebrow="Chiến dịch thương mại"
          title="Ưu đãi theo mùa và cẩm nang được đặt cạnh nhau để dễ theo dõi"
          description="Hành khách có thể xem nhanh chương trình đang áp dụng, đọc thêm thông tin liên quan và quay lại hành trình đặt vé mà không bị đứt mạch."
        />
        <div className="card-grid card-grid-3 promo-card-grid">
          {promotions.map((promotion, index) => {
            const photo = promotionPhotos[index % promotionPhotos.length];

            return (
              <article key={promotion.title} className="surface-card promo-card promo-card-soft blog-promo-card">
                <div className="blog-promo-card-copy">
                  <span className="pill">{promotion.tag}</span>
                  <h3>{promotion.title}</h3>
                  <p>{promotion.summary}</p>
                </div>
                <div className={`blog-promo-card-media blog-promo-card-media-${index}`}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 116px, (max-width: 1200px) 120px, 138px"
                    quality={100}
                    unoptimized
                    className="blog-promo-card-image"
                  />
                </div>
              </article>
            );
          })}
        </div>
        <style>{`
          .travel-news-grid {
            gap: 22px;
          }

          .promo-card-grid {
            gap: 22px;
          }

          .blog-promo-card {
            display: block;
            position: relative;
            min-height: 314px;
            padding: 22px 22px 14px;
          }

          .blog-promo-card::before {
            content: none;
          }

          .blog-promo-card-copy {
            display: grid;
            gap: 10px;
            max-width: calc(100% - 156px);
            align-content: start;
            position: relative;
            z-index: 1;
          }

          .blog-promo-card-copy h3,
          .blog-promo-card-copy p {
            margin: 0;
          }

          .blog-promo-card-copy p {
            max-width: none;
          }

          .blog-promo-card-media {
            position: absolute;
            right: 26px;
            bottom: 44px;
            overflow: hidden;
            width: 138px;
            height: 188px;
            border-radius: 26px;
          }

          .blog-promo-card-media::after {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(180deg, rgba(12, 34, 61, 0.08), rgba(12, 34, 61, 0.22)),
              radial-gradient(circle at top right, rgba(246, 215, 131, 0.3), transparent 26%);
          }

          .blog-promo-card-image {
            object-fit: cover;
            object-position: center;
          }

          .blog-promo-card-media-1 .blog-promo-card-image {
            transform: scale(1.14);
            object-position: center 42%;
          }

          .travel-news-card {
            gap: 0;
            padding: 0;
            overflow: hidden;
            text-decoration: none;
            color: inherit;
            border-radius: 22px;
            border: 1px solid rgba(18, 61, 105, 0.09);
            background: #ffffff;
            box-shadow: 0 10px 24px rgba(18, 61, 105, 0.05);
            transition:
              transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.22s ease;
          }

          .travel-news-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(18, 61, 105, 0.12);
            border-color: rgba(18, 61, 105, 0.22);
          }

          .travel-news-card:focus-visible {
            outline: 2px solid var(--brand-accent);
            outline-offset: 3px;
          }

          .travel-news-card-media {
            overflow: hidden;
            border-radius: 22px 22px 0 0;
            background: linear-gradient(180deg, rgba(232, 240, 248, 0.9), rgba(246, 249, 252, 0.98));
          }

          .travel-news-card-media img {
            width: 100%;
            height: auto;
            display: block;
            object-fit: contain;
            object-position: center;
          }

          .travel-news-card-copy {
            display: grid;
            gap: 10px;
            padding: 20px;
          }

          .travel-news-card-copy h3 {
            margin: 0;
            line-height: 1.24;
            transition: color 0.2s ease;
          }

          .travel-news-card:hover .travel-news-card-copy h3 {
            color: var(--primary);
          }

          .travel-news-card-copy p {
            margin: 0;
            color: rgba(14, 40, 69, 0.78);
            line-height: 1.68;
          }

          .travel-news-card-copy small {
            color: var(--muted);
            font-size: 0.84rem;
          }

          @media (max-width: 1200px) {
            .blog-promo-card {
              min-height: 330px;
            }

            .blog-promo-card-copy {
              max-width: calc(100% - 138px);
            }

            .blog-promo-card-media {
              right: 22px;
              bottom: 38px;
              width: 120px;
              height: 180px;
            }
          }

          @media (max-width: 1024px) {
            .travel-news-card:nth-child(n + 7) {
              display: none;
            }

            .blog-promo-card {
              min-height: 304px;
            }

            .blog-promo-card-copy {
              max-width: calc(100% - 132px);
            }

            .blog-promo-card-media {
              bottom: 34px;
              width: 112px;
              height: 164px;
            }
          }

          @media (max-width: 640px) {
            .travel-news-grid,
            .promo-card-grid {
              grid-template-columns: minmax(0, 1fr);
            }

            .travel-news-card:nth-child(n + 4) {
              display: none;
            }

            .blog-promo-card {
              min-height: auto;
              padding: 20px 20px 14px;
            }

            .blog-promo-card-copy {
              max-width: none;
              padding-bottom: 118px;
            }

            .blog-promo-card-media {
              right: 20px;
              bottom: 26px;
              width: 116px;
              height: 136px;
              border-radius: 24px;
            }

            .blog-promo-card-media-1 .blog-promo-card-image {
              transform: scale(1.08);
            }
          }
        `}</style>
      </div>
    </section>
  );
}
