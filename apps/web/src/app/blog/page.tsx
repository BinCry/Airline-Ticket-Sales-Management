import Image from "next/image";

import { getTravelArticles } from "@/lib/newsdata";
import { SectionHeading } from "@/components/section-heading";
import { promotions } from "@/lib/public-content";

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

export const revalidate = 604800;

export default async function BlogPage() {
  const travelArticles = await getTravelArticles(9, true);

  return (
    <section className="section">
      <div className="container">
        <div className="blog-hero">
          <div className="blog-hero-copy">
            <span className="section-eyebrow">Cẩm nang, hướng dẫn, khuyến mãi</span>
            <h1 className="page-title">Cẩm nang hành trình, điểm đến và ưu đãi theo mùa cho hành khách nội địa.</h1>
            <p className="page-hero-copy">
              Từ gợi ý điểm đến, kinh nghiệm đi sân bay đến chương trình ưu đãi theo
              mùa, nội dung được tổ chức để hỗ trợ hành khách lên kế hoạch và quay lại
              bước đặt vé đúng lúc.
            </p>
          </div>
          <div className="blog-hero-panel">
            <span className="pill">Nội dung nổi bật</span>
            <h3>Nội dung hỗ trợ quyết định đặt vé</h3>
            <p>
              Các bài viết và chương trình ưu đãi được sắp cạnh nhau để hành khách
              vừa đọc thông tin, vừa nhanh chóng quay lại lựa chọn hành trình phù hợp.
            </p>
          </div>
        </div>

        <div className="section-gap" />
        <div id="bai-viet" />
        <SectionHeading
          eyebrow="Tin du lịch mới"
          title="Danh sách bài báo du lịch đang được cập nhật từ nguồn tin tiếng Việt"
          description="Trang này gom nhiều bài báo du lịch để bạn theo dõi nhanh các điểm đến, trải nghiệm nghỉ dưỡng và xu hướng đi lại mới."
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
                <img src={article.image} alt={article.title} loading="lazy" />
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
          }

          .travel-news-card-media {
            aspect-ratio: 1.56;
            overflow: hidden;
            background: linear-gradient(180deg, rgba(232, 240, 248, 0.9), rgba(246, 249, 252, 0.98));
          }

          .travel-news-card-media img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            transition: transform 220ms ease;
          }

          .travel-news-card:hover .travel-news-card-media img {
            transform: scale(1.03);
          }

          .travel-news-card-copy {
            display: grid;
            gap: 12px;
            padding: 20px 20px 22px;
          }

          .travel-news-card-copy h3 {
            margin: 0;
            line-height: 1.24;
          }

          .travel-news-card-copy p {
            margin: 0;
            color: rgba(14, 40, 69, 0.78);
            line-height: 1.68;
          }

          .travel-news-card-copy small {
            color: var(--muted);
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
