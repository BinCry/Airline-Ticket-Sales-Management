import Link from "next/link";
import Image from "next/image";

import { FlightSearchPanel } from "@/components/flight-search-panel";
import { JourneyPhoneVideo } from "@/components/journey-phone-video";
import { SectionHeading } from "@/components/section-heading";
import {
  destinations,
  promotions,
  quickServices,
  supportChannels
} from "@/lib/public-content";
import { getLatestTravelArticles } from "@/lib/newsdata";

const promotionPhotos = [
  { src: "/images/summer-promo.jpg", alt: "Hình minh hoạ chiến dịch mùa hè" },
  { src: "/images/member-promo-v2.png", alt: "Hình minh hoạ hội viên Vietnam Airlines" },
  { src: "/images/business-promo.jpg", alt: "Hình minh hoạ doanh nghiệp với dữ liệu tài chính" }
] as const;

const liveOperations = [
  {
    title: "Bán vé công khai",
    note: "Tìm chuyến bay, xem giá và chọn tiện ích ngay từ trang đầu."
  },
  {
    title: "Tự phục vụ sau bán",
    note: "Tra cứu đặt chỗ, đổi chuyến, mua thêm dịch vụ và làm thủ tục trực tuyến."
  },
  {
    title: "Hỗ trợ trước giờ bay",
    note: "Theo dõi tình trạng chuyến bay, cửa ra tàu và những lưu ý cần thiết trước khi khởi hành."
  }
];

const travelServiceMetrics = [
  { label: "Mở làm thủ tục", value: "24 giờ", detail: "Trước giờ khởi hành với chặng nội địa" },
  { label: "Đóng làm thủ tục", value: "60 phút", detail: "Áp dụng cho hành khách khởi hành từ sân bay nội địa" },
  { label: "Giữ chỗ", value: "15 phút", detail: "Sau khi chọn chuyến bay và trước khi hoàn tất thanh toán" }
];

const servicePerformanceMetrics = [
  {
    label: "Tỷ lệ lấp đầy trên tuyến trực tuyến",
    value: "92%",
    detail: "Cập nhật theo tình hình khai thác trong ngày"
  },
  {
    label: "Tốc độ xuất vé",
    value: "Dưới 60 giây",
    detail: "Sau khi phản hồi thanh toán thành công"
  },
  {
    label: "Yêu cầu hỗ trợ đang mở",
    value: "18",
    detail: "Ưu tiên phản hồi trong ngày đối với các tình huống cần hỗ trợ gấp"
  }
];

const travelerTopics = [
  "Quy định hành lý xách tay",
  "Điều kiện đổi hoặc hoàn vé",
  "Giấy tờ cần mang theo",
  "Hỗ trợ hành khách đặc biệt",
  "Thông tin sân bay",
  "Cập nhật cửa ra tàu"
];

const featuredDestinations = [
  ...destinations.map((destination) => ({
    ...destination,
    displayCity:
      destination.code === "SGN" ? "TP. Hồ Chí Minh" : destination.city
  })),
  {
    code: "CXR",
    city: "Nha Trang",
    displayCity: "Nha Trang",
    airport: "Cam Ranh",
    tagline: "Thích hợp nghỉ dưỡng biển và hành trình ngắn ngày",
    highlights: ["Biển xanh trung tâm", "Combo nghỉ dưỡng", "Đưa đón sân bay thuận tiện"]
  },
  {
    code: "HUI",
    city: "Huế",
    displayCity: "Huế",
    airport: "Phú Bài",
    tagline: "Phù hợp khám phá di sản và chuyến đi cuối tuần",
    highlights: ["Di sản cố đô", "Lịch trình cuối tuần", "Gợi ý tham quan nội thành"]
  }
];

export const revalidate = 0;

export default async function HomePage() {
  const latestArticleShowcase = await getLatestTravelArticles(3);

  return (
    <>
      <section className="hero-section home-hero-section">
        <div className="container hero-grid home-hero-grid">
          <div className="hero-copy hero-copy-rich home-hero-copy">
            <span className="section-eyebrow home-hero-eyebrow">Vietnam Airlines</span>
            <h1>Tìm chuyến nhanh. Bay theo cách của bạn.</h1>
            <p>
              So sánh giờ bay, chọn hạng vé và bắt đầu hành trình ngay tại đây.
            </p>
            <Link href="/manage-booking" className="text-button home-hero-manage-link">
              Đã có vé? Quản lý đặt chỗ
              <span aria-hidden="true">→</span>
            </Link>
            <div className="hero-photo-ribbon home-hero-photo-ribbon">
              <div className="hero-photo-card hero-photo-card-large">
                <Image
                  src="/images/airport-terminal.jpg"
                  alt="Máy bay đỗ tại nhà ga sân bay"
                  fill
                  sizes="(max-width: 820px) 100vw, 420px"
                />
              </div>
              <div className="hero-photo-card">
                <Image
                  src="/images/vietnam-airport.jpg"
                  alt="Cầu ống lồng tại sân bay Việt Nam"
                  fill
                  sizes="(max-width: 820px) 100vw, 220px"
                />
              </div>
            </div>
          </div>
          <div className="hero-panel-stack home-hero-panel-stack">
            <div className="home-hero-search-shell">
              <FlightSearchPanel />
            </div>
          </div>
        </div>
      </section>

      <section className="ops-strip">
        <div className="container ops-strip-grid">
          {liveOperations.map((item, index) => (
            <article key={item.title} className={`ops-strip-card ops-strip-card-${index}`}>
              <div className="ops-strip-head">
                <span className={`pill ops-pill ops-pill-${index}`}>
                  <span className="ops-dot" aria-hidden="true" />
                  {item.title}
                </span>
              </div>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-quick-section">
        <div className="container">
          <div className="home-quick-heading">
            <SectionHeading
              eyebrow="Tiện ích nhanh"
              title="Những tiện ích hành khách cần nhất được đưa lên ngay từ đầu hành trình"
            />
          </div>
          <div className="editorial-grid home-quick-content-grid">
            <div className="quick-services-column">
              <div className="quick-grid">
                {quickServices.map((service, index) => (
                  <Link
                    key={service.title}
                    href={service.href}
                    className={`feature-card feature-card-rich tien-ich-card tien-ich-card-${index}`}
                  >
                    <div className="tien-ich-top">
                      <span className={`pill tien-ich-tag tien-ich-tag-${index}`}>
                        {index === 0 ? "Đặt vé" : index === 1 ? "Sau bán" : index === 2 ? "Check-in" : "24/7"}
                      </span>
                    </div>
                    <div className="tien-ich-body">
                      <h3 className="tien-ich-title">{service.title}</h3>
                      <p className="tien-ich-subtitle">{service.subtitle}</p>
                    </div>
                    <div className="tien-ich-cta">
                      <span>Mở tiện ích</span>
                      <span className="tien-ich-arrow" aria-hidden="true">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="journey-showcase">
              <div className="journey-showcase-copy">
                <span className="section-eyebrow">Trải nghiệm hành khách</span>
                <h3>Mọi bước chuẩn bị cho chuyến bay ở ngay trong tầm tay</h3>
                <p className="journey-showcase-intro">
                  Đặt vé, làm thủ tục và theo dõi hành trình trong một trải nghiệm liền mạch.
                </p>
                <div className="journey-actions">
                  <Link href="/search" className="journey-action journey-action-primary">
                    Tìm chuyến bay
                  </Link>
                  <Link href="/check-in" className="journey-action">
                    Làm thủ tục
                  </Link>
                </div>
                <div className="journey-stat-row" aria-label="Thông tin dịch vụ">
                  <div>
                    <strong>24/7</strong>
                    <span>Hỗ trợ trực tuyến</span>
                  </div>
                  <div>
                    <strong>60′</strong>
                    <span>Tra cứu trước giờ bay</span>
                  </div>
                </div>
              </div>

              <div className="journey-phone">
                <div className="journey-phone-island" aria-hidden="true" />
                <JourneyPhoneVideo />
                <span className="journey-phone-home" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="diem-den" className="section home-destination-section">
        <div className="container">
          <SectionHeading
            eyebrow="Điểm đến & chiến dịch"
            title="Khám phá các đường bay nội địa nổi bật cho kỳ nghỉ, công tác và du lịch ngắn ngày"
            description="Mỗi điểm đến đi kèm sân bay khai thác, định hướng hành trình và các gợi ý nổi bật để hành khách có thêm căn cứ trước khi chọn chuyến đi."
          />
          <div className="destination-editorial-grid home-destination-grid">
            {featuredDestinations.map((destination, index) => (
              <article
                key={destination.code}
                className={`destination-card destination-card-rich home-destination-card destination-card-${index + 1}`}
              >
                <div className="destination-overlay home-destination-overlay">
                  <div className="destination-top home-destination-top">
                    <div>
                      <strong>{destination.displayCity}</strong>
                      <p>{destination.airport}</p>
                    </div>
                    <span className="pill">Điểm đến nổi bật</span>
                  </div>
                  <div className="destination-bottom home-destination-bottom">
                    <h3>{destination.tagline}</h3>
                    <ul className="list-clean home-destination-list">
                      {destination.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-latest-articles-section">
        <div className="container">
          <div className="home-latest-articles-head">
            <div className="home-latest-articles-title">
              <div className="home-latest-articles-icon" aria-hidden="true">
                <span className="home-latest-articles-icon-back" />
                <span className="home-latest-articles-icon-front" />
              </div>
              <h2>Các bài viết mới nhất</h2>
            </div>
            <p>Luôn nắm bắt những kinh nghiệm du lịch mới nhất</p>
          </div>

          <div className="home-latest-articles-grid">
            {latestArticleShowcase.map((article) => (
              <a
                key={article.title}
                href={article.href}
                className="home-latest-article-card"
                rel={article.external ? "noreferrer" : undefined}
                target={article.external ? "_blank" : undefined}
              >
                <div className="home-latest-article-media">
                  <img
                    src={article.image}
                    alt={article.title}
                    width={640}
                    height={410}
                    loading="lazy"
                  />
                </div>
                <div className="home-latest-article-copy">
                  <h3>{article.title}</h3>
                  <span>{article.source}</span>
                  <small>{article.readTime}</small>
                </div>
              </a>
            ))}
          </div>

          <div className="home-latest-articles-cta">
            <Link href="/blog" className="button button-secondary home-latest-articles-button">
              Đọc thêm các bài viết du lịch
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Ưu đãi theo mùa"
            title="Những chương trình nên xem ngay trước khi chốt hành trình"
            description="Ưu đãi được gom theo từng nhóm nhu cầu để hành khách dễ đối chiếu quyền lợi, thời hạn áp dụng và quay lại bước đặt vé nhanh hơn."
          />
          <div className="card-grid card-grid-3 home-promo-grid">
            {promotions.map((promotion, index) => {
              const photo = promotionPhotos[index % promotionPhotos.length];

              return (
                <article key={promotion.title} className="surface-card promo-card home-promo-card">
                  <div className="home-promo-card-copy">
                    <span className="pill">{promotion.tag}</span>
                    <h3>{promotion.title}</h3>
                    <p>{promotion.summary}</p>
                    <Link href={promotion.href} className="text-button">
                      {promotion.cta}
                    </Link>
                  </div>
                  <div className={`home-promo-card-media home-promo-card-media-${index}`}>
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 640px) 116px, (max-width: 1200px) 120px, 138px"
                      quality={100}
                      unoptimized
                      className="home-promo-card-image"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="thong-tin-chuyen-bay" className="section home-prep-section">
        <div className="container">
          <SectionHeading
            eyebrow="Chuẩn bị trước giờ bay"
            title="Những thông tin hành khách nên xem trước khi ra sân bay"
            description="Từ thời gian làm thủ tục, quy định hành lý đến kênh hỗ trợ và tình trạng chuyến bay, mọi thông tin quan trọng đều được gom lại để tra cứu nhanh."
          />
          <div className="home-prep-grid">
            {/* Cột 1: Mốc thời gian làm thủ tục */}
            <article className="surface-card home-prep-card home-prep-timing-card">
              <div className="home-prep-card-head">
                <span className="pill home-prep-badge">Quy chuẩn giờ bay</span>
                <h3>Thời gian làm thủ tục & giữ chỗ</h3>
              </div>
              <div className="home-prep-timing-list">
                {travelServiceMetrics.map((metric) => (
                  <div key={metric.label} className="home-prep-timing-item">
                    <div className="home-prep-timing-badge">{metric.value}</div>
                    <div className="home-prep-timing-copy">
                      <strong>{metric.label}</strong>
                      <p>{metric.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Cột 2: Cẩm nang hành khách thường quan tâm */}
            <article className="surface-card home-prep-card home-prep-topics-card">
              <div className="home-prep-card-head">
                <span className="pill home-prep-badge">Cẩm nang tra cứu</span>
                <h3>Hành khách thường quan tâm</h3>
              </div>
              <p className="home-prep-desc">
                Các nội dung được tra cứu nhiều nhất trước ngày bay để hành khách chuẩn bị chu đáo.
              </p>
              <div className="home-prep-topics-grid">
                {travelerTopics.map((topic) => (
                  <Link key={topic} href="/support" className="home-prep-topic-chip">
                    <span className="home-prep-topic-dot" aria-hidden="true">›</span>
                    <span>{topic}</span>
                  </Link>
                ))}
              </div>
            </article>

            {/* Cột 3: Kênh hỗ trợ đa lớp */}
            <article className="surface-card home-prep-card home-prep-support-card">
              <div className="home-prep-card-head">
                <span className="pill home-prep-badge">Hỗ trợ 24/7</span>
                <h3>Kênh trợ giúp hành khách</h3>
              </div>
              <div className="home-prep-support-list">
                {supportChannels.map((channel) => (
                  <div key={channel.title} className="home-prep-support-item">
                    <div className="home-prep-support-info">
                      <strong>{channel.title}</strong>
                      <p>{channel.description}</p>
                    </div>
                    <span className="home-prep-support-pill">{channel.channel}</span>
                  </div>
                ))}
              </div>
              <Link href="/support" className="button button-primary home-prep-cta-button">
                Đến trung tâm hỗ trợ
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section home-service-metrics-section" aria-label="Thông số dịch vụ">
        <div className="container home-service-metrics">
          {servicePerformanceMetrics.map((metric) => (
            <article key={metric.label} className="home-service-metric-card">
              <span className="home-service-metric-label">{metric.label}</span>
              <strong className="home-service-metric-value">{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </div>
      </section>
      <style>{`
        
        .home-prep-section {
          background: #ffffff;
          padding: 56px 0;
        }

        .home-prep-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          align-items: stretch;
        }

        .home-prep-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 28px 24px;
          border-radius: 24px;
          border: 1px solid rgba(18, 61, 105, 0.1);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 16px 36px rgba(18, 61, 105, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .home-prep-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 48px rgba(18, 61, 105, 0.1);
        }

        .home-prep-card-head {
          display: grid;
          gap: 8px;
        }

        .home-prep-card-head h3 {
          margin: 0;
          color: var(--primary);
          font-size: 1.25rem;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }

        .home-prep-badge {
          width: fit-content;
          background: rgba(18, 61, 105, 0.08);
          color: var(--primary);
          font-size: 0.76rem;
          font-weight: 700;
        }

        .home-prep-desc {
          margin: 0;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .home-prep-timing-list {
          display: grid;
          gap: 14px;
        }

        .home-prep-timing-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(18, 61, 105, 0.035);
          border: 1px solid rgba(18, 61, 105, 0.07);
        }

        .home-prep-timing-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 82px;
          height: 44px;
          padding: 0 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #123d69, #1b5b90);
          color: #fff;
          font-weight: 800;
          font-size: 1.05rem;
          white-space: nowrap;
          box-shadow: 0 8px 18px rgba(18, 61, 105, 0.18);
          flex-shrink: 0;
        }

        .home-prep-timing-copy {
          display: grid;
          gap: 3px;
        }

        .home-prep-timing-copy strong {
          color: var(--primary);
          font-size: 0.96rem;
          line-height: 1.25;
        }

        .home-prep-timing-copy p {
          margin: 0;
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .home-prep-topics-grid {
          display: grid;
          gap: 10px;
        }

        .home-prep-topic-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          border-radius: 14px;
          background: rgba(202, 164, 95, 0.08);
          border: 1px solid rgba(202, 164, 95, 0.2);
          color: var(--text-primary);
          font-size: 0.88rem;
          font-weight: 600;
          transition: all 0.18s ease;
        }

        .home-prep-topic-chip:hover {
          background: rgba(202, 164, 95, 0.16);
          border-color: rgba(202, 164, 95, 0.4);
          color: var(--primary);
          transform: translateX(3px);
        }

        .home-prep-topic-dot {
          color: var(--brand-accent);
          font-size: 0.75rem;
        }

        .home-prep-support-list {
          display: grid;
          gap: 12px;
          flex-grow: 1;
        }

        .home-prep-support-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(18, 61, 105, 0.035);
          border: 1px solid rgba(18, 61, 105, 0.07);
        }

        .home-prep-support-info strong {
          color: var(--primary);
          font-size: 0.94rem;
          line-height: 1.3;
        }

        .home-prep-support-info p {
          margin: 2px 0 0;
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .home-prep-support-pill {
          width: fit-content;
          color: #123d69;
          font-size: 0.86rem;
          font-weight: 800;
          letter-spacing: 0.01em;
          background: rgba(18, 61, 105, 0.08);
          padding: 3px 10px;
          border-radius: 8px;
        }

        .home-prep-cta-button {
          width: 100%;
          min-height: 48px;
          margin-top: 4px;
        }

        @media (max-width: 1024px) {
          .home-prep-grid {
            grid-template-columns: 1fr;
          }
        }

        .ops-strip {
          margin-top: 18px;
          padding-bottom: 34px;
        }

        .ops-strip-grid,
        .editorial-grid,
        .section-split,
        .command-grid {
          gap: 28px;
        }

        .command-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
          align-items: start;
        }

        .command-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-content: start;
          align-items: start;
        }

        .command-side {
          display: grid;
          gap: 18px;
          align-content: start;
        }

        .quick-grid,
        .card-grid,
        .stack-list {
          gap: 20px;
        }

        .section {
          padding: 76px 0;
        }

        .section-heading {
          max-width: 780px;
          margin-bottom: 34px;
        }

        .section-heading h2 {
          color: rgba(6, 27, 48, 0.98);
          font-size: clamp(2.04rem, 3vw, 2.82rem);
          line-height: 1.05;
          letter-spacing: -0.034em;
          text-wrap: balance;
        }

        .section-dark .section-heading h2 {
          color: rgba(255, 248, 239, 0.97);
          text-shadow: 0 8px 24px rgba(7, 24, 41, 0.18);
        }

        .section-heading p {
          max-width: 68ch;
          color: rgba(14, 40, 69, 0.82);
          font-size: 1.01rem;
          line-height: 1.72;
        }

        .section-dark .section-heading p {
          color: rgba(247, 243, 234, 0.9);
          max-width: 70ch;
        }

        .feature-card h3,
        .spotlight-card h3,
        .promo-card h3,
        .article-card h3,
        .command-panel h3 {
          color: rgba(7, 29, 50, 0.97);
          font-size: clamp(1.18rem, 1.45vw, 1.34rem);
          line-height: 1.2;
          letter-spacing: -0.024em;
        }

        .feature-card p,
        .spotlight-card p,
        .promo-card p,
        .article-card p,
        .ops-strip-card p,
        .command-panel p {
          color: rgba(14, 40, 69, 0.78);
          font-size: 0.97rem;
          line-height: 1.7;
        }

        .home-promo-card {
          display: block;
          position: relative;
          min-height: 314px;
          padding: 22px 22px 14px;
        }

        .home-promo-card::before {
          content: none;
        }

        .home-promo-card-copy {
          display: grid;
          gap: 10px;
          max-width: calc(100% - 156px);
          align-content: start;
          position: relative;
          z-index: 1;
        }

        .home-promo-card-copy h3,
        .home-promo-card-copy p {
          margin: 0;
        }

        .home-promo-card-copy p {
          max-width: none;
        }

        .home-promo-card-media {
          position: absolute;
          right: 26px;
          bottom: 44px;
          overflow: hidden;
          width: 138px;
          height: 188px;
          border-radius: 26px;
        }

        .home-promo-card-media::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(12, 34, 61, 0.08), rgba(12, 34, 61, 0.22)),
            radial-gradient(circle at top right, rgba(246, 215, 131, 0.3), transparent 26%);
        }

        .home-promo-card-image {
          object-fit: cover;
          object-position: center;
        }

        .home-promo-card-media-1 .home-promo-card-image {
          transform: scale(1.14);
          object-position: center 42%;
        }

        .home-hero-section {
          padding: 48px 0 32px;
          background: #ffffff;
          box-shadow: none;
        }

        .home-hero-section::before {
          display: none;
        }

        .metric-card-dark,
        .command-panel {
          position: relative;
          overflow: hidden;
          border-color: rgba(255, 255, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.08)),
            radial-gradient(circle at top right, rgba(216, 176, 104, 0.18), transparent 32%),
            radial-gradient(circle at bottom left, rgba(92, 152, 217, 0.12), transparent 30%);
          box-shadow: 0 24px 58px rgba(3, 14, 30, 0.26);
          backdrop-filter: blur(16px);
        }

        .metric-card-dark {
          display: grid;
          align-content: start;
          gap: 10px;
          min-height: 192px;
        }

        .metric-card-dark:last-child {
          grid-column: 1 / -1;
        }

        .metric-card-dark span {
          display: block;
          color: rgba(247, 243, 234, 0.74);
          font-size: 0.82rem;
          font-weight: 600;
          line-height: 1.45;
          letter-spacing: 0.01em;
        }

        .metric-card-dark strong {
          display: block;
          margin: 0;
          color: rgba(255, 247, 232, 0.98);
          font-size: clamp(1.62rem, 1.9vw, 2rem);
          line-height: 1.02;
          letter-spacing: -0.03em;
        }

        .metric-card-dark p {
          margin: 0;
          color: rgba(247, 243, 234, 0.88);
        }

        .command-panel {
          display: grid;
          align-content: start;
          gap: 16px;
          min-height: 0;
          padding: 24px;
        }

        .section-dark .command-panel h3 {
          color: rgba(255, 247, 232, 0.98);
        }

        .section-dark .command-panel p {
          color: rgba(247, 243, 234, 0.84);
        }

        .section-dark .role-chip {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.1));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .compact-stack {
          gap: 0;
        }

        .support-channel-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .support-compact-item {
          display: grid;
          gap: 6px;
          min-height: 100%;
          padding: 16px 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
        }

        .support-compact-item strong {
          color: rgba(255, 248, 239, 0.98);
          font-size: 1.04rem;
          line-height: 1.28;
        }

        .support-compact-item p {
          margin: 0;
          color: rgba(247, 243, 234, 0.84);
          line-height: 1.7;
        }

        .support-compact-channel {
          color: rgba(255, 242, 220, 0.96);
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .home-hero-grid {
          grid-template-columns: minmax(0, 1.16fr) minmax(390px, 0.84fr);
          gap: 56px;
          align-items: start;
        }

        .home-hero-copy {
          display: grid;
          align-content: start;
          gap: 26px;
          padding: 48px 0 18px;
        }

        .home-hero-eyebrow {
          width: fit-content;
          min-height: 36px;
          margin-bottom: 0;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(151, 116, 54, 0.18);
          background: linear-gradient(
            135deg,
            rgba(255, 252, 246, 0.98),
            rgba(248, 239, 220, 0.94) 55%,
            rgba(232, 242, 252, 0.92)
          );
          color: rgba(104, 75, 24, 0.92);
          box-shadow: 0 14px 30px rgba(122, 92, 40, 0.1);
        }

        .home-hero-copy h1 {
          max-width: 32ch;
          color: rgba(6, 28, 49, 0.98);
          font-size: clamp(2.0rem, 4.0vw, 3.6rem);
          line-height: 1.04;
          letter-spacing: -0.042em;
          text-wrap: balance;
          text-shadow: 0 10px 26px rgba(255, 255, 255, 0.42);
        }

        .home-hero-copy > p {
          max-width: 64ch;
          margin: 0;
          color: rgba(13, 42, 72, 0.86);
          font-size: clamp(1.02rem, 1.12vw, 1.1rem);
          line-height: 1.76;
        }

        .home-hero-actions {
          gap: 14px;
          margin-top: 2px;
        }

        .home-hero-primary,
        .home-hero-secondary {
          min-height: 56px;
          padding: 0 24px;
          border-radius: 999px;
        }

        .home-hero-primary {
          border: 1px solid rgba(255, 255, 255, 0.42);
          background:
            radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.34), transparent 32%),
            linear-gradient(135deg, #0f385d 0%, #1b5b90 54%, #2e7cb8 100%);
          box-shadow:
            0 22px 38px rgba(11, 57, 96, 0.24),
            0 0 0 1px rgba(225, 195, 129, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.34);
        }

        .home-hero-secondary {
          color: rgba(10, 46, 80, 0.96);
          border: 1px solid rgba(151, 116, 54, 0.16);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.98),
            rgba(252, 245, 232, 0.96) 45%,
            rgba(235, 243, 252, 0.94)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.88),
            0 16px 30px rgba(18, 61, 105, 0.1);
        }

        .home-hero-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 8px;
        }

        .home-hero-stat-grid .hero-stat-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid rgba(18, 61, 105, 0.11);
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #fafcff 100%
          );
          box-shadow: 0 10px 24px rgba(18, 61, 105, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .home-hero-stat-grid .hero-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(18, 61, 105, 0.1);
          border-color: rgba(18, 61, 105, 0.22);
        }

        .home-hero-stat-grid .hero-stat-card span {
          color: var(--primary);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .home-hero-stat-grid .hero-stat-card strong {
          color: #0d3258;
          font-size: 1.42rem;
          font-weight: 800;
          line-height: 1.15;
          margin: 4px 0 6px;
          letter-spacing: -0.02em;
        }

        .home-hero-stat-grid .hero-stat-card p {
          color: var(--muted);
          font-size: 0.8rem;
          line-height: 1.45;
          margin: 0;
        }

        .home-hero-photo-ribbon {
          gap: 18px;
          margin-top: 4px;
        }

        .home-hero-photo-ribbon .hero-photo-card {
          border: 1px solid rgba(18, 61, 105, 0.08);
          box-shadow: 0 24px 44px rgba(18, 61, 105, 0.12);
        }

        .home-hero-photo-ribbon .hero-photo-card::after {
          background: linear-gradient(180deg, rgba(10, 27, 46, 0.04), rgba(10, 27, 46, 0.38));
        }

        .home-hero-panel-stack {
          gap: 22px;
          padding-top: 30px;
        }

        .home-hero-search-shell .search-panel {
          padding: 30px;
          border-radius: 30px;
          border-color: rgba(18, 61, 105, 0.11);
          background:
            radial-gradient(circle at top right, rgba(205, 173, 104, 0.16), transparent 30%),
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.94), transparent 28%),
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 1),
              rgba(250, 245, 237, 0.96) 46%,
              rgba(243, 248, 253, 0.96)
            );
          box-shadow: 0 22px 46px rgba(18, 61, 105, 0.12);
        }

        .home-hero-search-shell .search-panel-head {
          gap: 20px;
          margin-bottom: 18px;
        }

        .home-hero-search-shell .search-panel-head h2 {
          color: rgba(10, 35, 60, 0.95);
          font-size: 1.38rem;
        }

        .home-hero-search-shell .panel-kicker,
        .home-hero-search-shell .search-note,
        .home-hero-search-shell .field span,
        .home-hero-search-shell .field small,
        .home-hero-search-shell .search-footer p,
        .home-hero-search-shell .search-mini-metrics span {
          color: rgba(16, 45, 78, 0.72);
        }

        .home-hero-search-shell .search-mini-metrics div {
          border: 1px solid rgba(18, 61, 105, 0.1);
          background: linear-gradient(
            135deg,
            rgba(255, 250, 242, 0.96),
            rgba(240, 247, 254, 0.88)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
        }

        .home-hero-search-shell .toggle-group {
          gap: 10px;
          padding: 8px;
          background: rgba(18, 61, 105, 0.07);
        }

        .home-hero-search-shell .field input,
        .home-hero-search-shell .field select {
          border-color: rgba(18, 61, 105, 0.14);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .home-hero-search-shell .route-field input {
          color: rgba(10, 35, 60, 0.96);
        }

        .home-hero-search-shell .assurance-chip {
          border: 1px solid rgba(18, 61, 105, 0.1);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.94),
            rgba(236, 245, 255, 0.88)
          );
          color: rgba(12, 56, 100, 0.86);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
        }

        .home-hero-search-shell .search-footer {
          align-items: center;
          margin-top: 24px;
        }

        .home-hero-search-shell .search-footer > div:first-child {
          min-width: 0;
          flex: 1 1 auto;
        }

        .home-hero-search-shell .search-footer > .button-primary {
          /* Cố định bề rộng tối thiểu 180px để cả "Tìm chuyến bay" và "Đang mở kết quả" không bị nhảy kích thước hay tràn viền */
          flex: 0 0 180px;
          min-width: 180px;
          white-space: nowrap;
        }

        .home-hero-search-shell .search-footer .button-primary {
          min-height: 54px;
          padding: 0 22px;
          border: 1px solid rgba(255, 255, 255, 0.44);
          background:
            radial-gradient(circle at 24% 20%, rgba(255, 255, 255, 0.32), transparent 34%),
            linear-gradient(135deg, #154f87 0%, #2471bd 52%, #4b9ee8 100%);
          box-shadow:
            0 18px 34px rgba(20, 78, 135, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.34);
        }

        /* Bảng Vận hành trực tuyến đồng bộ với nền sáng của trang chủ */
        .home-hero-board {
          padding: 20px 22px;
          border-radius: 24px;
          border: 1px solid rgba(18, 61, 105, 0.12);
          background: linear-gradient(145deg, #f7fbff 0%, #eef5fb 58%, #fbf7ee 100%);
          box-shadow: 0 22px 46px rgba(18, 61, 105, 0.12);
        }

        .home-hero-board .hero-glass-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(18, 61, 105, 0.1);
        }

        .home-hero-board .pill {
          border: 1px solid rgba(185, 139, 48, 0.34);
          background: rgba(202, 164, 95, 0.14);
          color: #805d18;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .home-hero-board .status-chip {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 5px 10px;
          border: 1px solid rgba(16, 137, 92, 0.2);
          border-radius: 999px;
          background: rgba(16, 137, 92, 0.08);
          color: #08724d;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .home-hero-board .hero-highlight-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 0;
        }

        .home-hero-board .hero-highlight-row + .hero-highlight-row {
          border-top: 1px solid rgba(18, 61, 105, 0.1);
        }

        .home-hero-board .hero-highlight-row p {
          margin: 0;
          color: rgba(14, 40, 69, 0.84);
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1.5;
        }

        .home-hero-board .dot {
          width: 8px;
          height: 8px;
          margin-top: 6px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #10a870;
          box-shadow: 0 0 0 3px rgba(16, 168, 112, 0.16);
        }

        /* Các ô vận hành dùng cùng một baseline và màu nền phân nhóm nhẹ. */
        .ops-strip {
          margin-top: 10px;
          padding-bottom: 16px;
        }

        .home-quick-section {
          padding-top: 48px;
        }

        .ops-strip-grid {
          align-items: stretch;
        }

        .ops-strip-card {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          align-content: stretch;
          min-height: 132px;
          height: 100%;
          box-sizing: border-box;
          padding: 18px 20px;
        }

        .ops-strip-card.ops-strip-card-0 {
          background: linear-gradient(145deg, #f4f9fe, #eaf3fb);
        }

        .ops-strip-card.ops-strip-card-1 {
          background: linear-gradient(145deg, #fffaf0, #f8f4eb);
        }

        .ops-strip-card.ops-strip-card-2 {
          background: linear-gradient(145deg, #f3fbf7, #eaf7f1);
        }

        .ops-strip-head {
          display: flex;
          align-items: flex-start;
          min-height: 32px;
        }

        .ops-strip-head .pill {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          box-sizing: border-box;
        }

        .ops-strip-card p {
          align-self: start;
          margin: 0;
          line-height: 1.55;
        }

        .ops-strip-card-0 .ops-pill {
          border-color: rgba(33, 111, 175, 0.2);
          background: rgba(76, 147, 207, 0.1);
          color: #174f80;
        }

        .ops-strip-card-1 .ops-pill {
          border-color: rgba(184, 140, 57, 0.22);
          background: rgba(210, 172, 95, 0.12);
          color: #805d18;
        }

        .ops-strip-card-2 .ops-pill {
          border-color: rgba(17, 141, 96, 0.2);
          background: rgba(32, 166, 119, 0.1);
          color: #08724d;
        }

        .home-destination-section {
          padding: 56px 0;
          background: #ffffff;
        }

        .home-latest-articles-section {
          padding-top: 42px;
          padding-bottom: 22px;
        }

        .home-latest-articles-head {
          display: grid;
          gap: 12px;
          margin-bottom: 32px;
        }

        .home-latest-articles-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .home-latest-articles-title h2 {
          margin: 0;
          color: rgba(7, 29, 50, 0.97);
          font-size: clamp(1.8rem, 2.7vw, 2.54rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
        }

        .home-latest-articles-head p {
          margin: 0;
          color: rgba(14, 40, 69, 0.6);
          font-size: 1.02rem;
          font-weight: 600;
          line-height: 1.7;
        }

        .home-latest-articles-icon {
          position: relative;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
        }

        .home-latest-articles-icon-back,
        .home-latest-articles-icon-front {
          position: absolute;
          border-radius: 10px;
          border: 1px solid rgba(74, 132, 205, 0.22);
          box-shadow: 0 12px 22px rgba(20, 77, 134, 0.12);
        }

        .home-latest-articles-icon-back {
          inset: 5px 1px 1px 9px;
          background: linear-gradient(180deg, rgba(121, 183, 248, 0.24), rgba(84, 146, 224, 0.12));
        }

        .home-latest-articles-icon-front {
          inset: 1px 9px 5px 1px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.96)),
            linear-gradient(135deg, rgba(116, 178, 246, 0.18), rgba(210, 177, 102, 0.08));
        }

        .home-latest-articles-icon-front::before,
        .home-latest-articles-icon-front::after {
          content: "";
          position: absolute;
          left: 7px;
          border-radius: 4px;
        }

        .home-latest-articles-icon-front::before {
          top: 7px;
          width: 16px;
          height: 5px;
          background: linear-gradient(90deg, rgba(113, 191, 106, 0.98), rgba(191, 226, 102, 0.92));
        }

        .home-latest-articles-icon-front::after {
          top: 15px;
          width: 11px;
          height: 5px;
          background: linear-gradient(90deg, rgba(86, 151, 226, 0.92), rgba(126, 183, 246, 0.88));
        }

        .home-latest-articles-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        /* Thẻ bài viết với hiệu ứng hover/focus tương tác tinh tế */
        .home-latest-article-card {
          display: flex;
          flex-direction: column;
          border-radius: 22px;
          border: 1px solid rgba(18, 61, 105, 0.09);
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(18, 61, 105, 0.05);
          color: inherit;
          text-decoration: none;
          transition:
            transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.22s ease;
        }

        .home-latest-article-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(18, 61, 105, 0.12);
          border-color: rgba(18, 61, 105, 0.22);
        }

        .home-latest-article-card:focus-visible {
          outline: 2px solid var(--brand-accent);
          outline-offset: 3px;
        }

        .home-latest-article-media {
          position: relative;
          overflow: hidden;
          border-radius: 22px 22px 0 0;
          background: linear-gradient(180deg, rgba(230, 239, 248, 0.62), rgba(244, 248, 252, 0.98));
        }

        .home-latest-article-media::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(7, 24, 41, 0) 40%, rgba(7, 24, 41, 0.15) 100%);
          pointer-events: none;
        }

        .home-latest-article-media img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          object-position: center;
        }

        .home-latest-article-copy {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px 18px 20px;
          flex-grow: 1;
        }

        .home-latest-article-copy h3 {
          margin: 0;
          color: rgba(7, 29, 50, 0.97);
          font-size: clamp(1.06rem, 1.35vw, 1.22rem);
          line-height: 1.26;
          letter-spacing: -0.02em;
          transition: color 0.2s ease;
        }

        .home-latest-article-card:hover .home-latest-article-copy h3 {
          color: var(--primary);
        }

        .home-latest-article-copy span,
        .home-latest-article-copy small {
          color: rgba(14, 40, 69, 0.6);
          font-size: 0.86rem;
          font-weight: 600;
          line-height: 1.5;
        }

        .home-latest-articles-cta {
          display: flex;
          justify-content: center;
          margin-top: 32px;
        }

        /* Nút CTA đọc thêm với hiệu ứng tương tác sang trọng */
        .home-latest-articles-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 52px;
          padding: 0 28px;
          border-radius: 999px;
          border: 1.5px solid rgba(18, 61, 105, 0.18);
          background: #ffffff;
          color: var(--primary);
          font-weight: 700;
          font-size: 0.94rem;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 10px 24px rgba(18, 61, 105, 0.06);
          transition:
            transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            color 0.2s ease;
        }

        .button-secondary.home-latest-articles-button:hover {
          background: linear-gradient(135deg, #123d69 0%, #287fbd 100%);
          border-color: #123d69;
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(18, 61, 105, 0.24);
          color: #ffffff;
        }

        .home-latest-articles-button:focus-visible {
          outline: 2px solid var(--brand-accent);
          outline-offset: 3px;
        }

        .home-latest-articles-button span {
          display: inline-block;
          font-size: 1.25rem;
          line-height: 1;
          transition: transform 0.2s ease;
        }

        .home-latest-articles-button:hover span,
        .home-latest-articles-button:focus-visible span {
          transform: translateX(4px);
        }

        .ops-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          margin-right: 6px;
          vertical-align: middle;
        }

        /* BỐ CỤC 4 THẺ TIỆN ÍCH NHANH CÂN ĐỐI, GỌN GÀNG VÀ ĐỒNG BỘ */
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .tien-ich-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(18, 61, 105, 0.1);
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(18, 61, 105, 0.04);
          transition:
            transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.22s ease,
            background 0.22s ease;
          text-decoration: none;
          min-height: 184px;
        }

        .tien-ich-card:focus-visible {
          outline: 2px solid var(--brand-accent);
          outline-offset: 3px;
        }

        .tien-ich-card-0:hover {
          transform: translateY(-3px);
          background: linear-gradient(180deg, #ffffff 0%, #f2f7fd 100%) !important;
          border-color: #1e5f9e !important;
          box-shadow: 0 18px 36px rgba(18, 61, 105, 0.12) !important;
        }

        .tien-ich-card-1:hover {
          transform: translateY(-3px);
          background: linear-gradient(180deg, #ffffff 0%, #fdf9f0 100%) !important;
          border-color: #caa45f !important;
          box-shadow: 0 18px 36px rgba(202, 164, 95, 0.16) !important;
        }

        .tien-ich-card-2:hover {
          transform: translateY(-3px);
          background: linear-gradient(180deg, #ffffff 0%, #f0fbf5 100%) !important;
          border-color: #16a374 !important;
          box-shadow: 0 18px 36px rgba(15, 139, 96, 0.14) !important;
        }

        .tien-ich-card-3:hover {
          transform: translateY(-3px);
          background: linear-gradient(180deg, #ffffff 0%, #f2f9ff 100%) !important;
          border-color: #38bdf8 !important;
          box-shadow: 0 18px 36px rgba(20, 100, 177, 0.14) !important;
        }

        .tien-ich-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .tien-ich-tag {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 999px;
        }

        .tien-ich-tag-0 {
          background: rgba(18, 61, 105, 0.08);
          color: #123d69;
          border: 1px solid rgba(18, 61, 105, 0.16);
        }

        .tien-ich-tag-1 {
          background: rgba(202, 164, 95, 0.12);
          color: #8c6414;
          border: 1px solid rgba(202, 164, 95, 0.26);
        }

        .tien-ich-tag-2 {
          background: rgba(15, 139, 96, 0.1);
          color: #0b734f;
          border: 1px solid rgba(15, 139, 96, 0.2);
        }

        .tien-ich-tag-3 {
          background: rgba(20, 100, 177, 0.1);
          color: #125ea8;
          border: 1px solid rgba(20, 100, 177, 0.2);
        }

        .tien-ich-body {
          margin-bottom: 10px;
        }

        .tien-ich-title {
          margin: 0 0 4px;
          color: var(--primary);
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }

        .tien-ich-subtitle {
          margin: 0;
          color: rgba(14, 40, 69, 0.68);
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .tien-ich-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--primary);
          font-size: 0.82rem;
          font-weight: 700;
          transition: gap 0.18s ease, color 0.18s ease;
        }

        .tien-ich-card:hover .tien-ich-cta {
          gap: 8px;
        }

        .tien-ich-card-0:hover .tien-ich-cta { color: #1e5f9e; }
        .tien-ich-card-1:hover .tien-ich-cta { color: #8c6414; }
        .tien-ich-card-2:hover .tien-ich-cta { color: #0b734f; }
        .tien-ich-card-3:hover .tien-ich-cta { color: #125ea8; }

        .tien-ich-card:hover .tien-ich-subtitle {
          color: rgba(14, 40, 69, 0.88);
        }

        .tien-ich-arrow {
          font-size: 0.95rem;
          transition: transform 0.18s ease;
        }

        .tien-ich-card:hover .tien-ich-arrow {
          transform: translateX(3px);
        }

        .ops-strip-card,
        .spotlight-card,
        .feature-card-rich,
        .promo-card,
        .article-card {
          border-color: rgba(18, 61, 105, 0.1);
          background: #ffffff;
          box-shadow: 0 16px 36px rgba(18, 61, 105, 0.06);
        }

        .home-quick-heading {
          max-width: 820px;
          margin-bottom: 32px;
        }

        .home-quick-heading .section-heading {
          margin-bottom: 0;
        }

        .home-quick-content-grid {
          align-items: stretch;
        }

        .spotlight-card {
          padding: 22px 24px;
        }

        .journey-showcase {
          position: relative;
          isolation: isolate;
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(208px, 1fr);
          align-items: center;
          gap: 24px;
          align-self: stretch;
          min-width: 0;
          overflow: hidden;
          padding: 28px;
          border: 1px solid rgba(18, 61, 105, 0.12);
          border-radius: 30px;
          background:
            radial-gradient(circle at 100% 0%, rgba(202, 164, 95, 0.22), transparent 34%),
            linear-gradient(145deg, #f6f9fc 0%, #ffffff 56%, #f6efe2 100%);
          box-shadow: 0 22px 48px rgba(18, 61, 105, 0.09);
        }

        .journey-showcase::before {
          content: "";
          position: absolute;
          z-index: -1;
          width: 220px;
          height: 220px;
          right: -86px;
          bottom: -98px;
          border-radius: 50%;
          background: rgba(18, 61, 105, 0.08);
        }

        .journey-showcase-copy {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .journey-showcase-copy h3 {
          margin: 0;
          color: var(--primary);
          font-size: clamp(1.34rem, 2vw, 1.82rem);
          line-height: 1.12;
          letter-spacing: -0.035em;
        }

        .journey-showcase-intro {
          margin: 0;
          color: rgba(14, 40, 69, 0.72);
          font-size: 0.94rem;
          line-height: 1.55;
        }

        .journey-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .journey-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 15px;
          border: 1px solid rgba(18, 61, 105, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--primary);
          font-size: 0.8rem;
          font-weight: 750;
          text-decoration: none;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .journey-action:hover,
        .journey-action:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(18, 61, 105, 0.28);
          background: #ffffff;
          box-shadow: 0 8px 18px rgba(18, 61, 105, 0.1);
        }

        .journey-action-primary {
          border-color: #123d69;
          background: #123d69;
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(18, 61, 105, 0.16);
        }

        .journey-action-primary:hover,
        .journey-action-primary:focus-visible {
          border-color: #0d2f52;
          background: #0d2f52;
          color: #ffffff;
        }

        .journey-stat-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          padding-top: 2px;
        }

        .journey-stat-row div {
          display: grid;
          gap: 3px;
        }

        .journey-stat-row strong {
          color: #0b6f8e;
          font-size: 1.35rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .journey-stat-row span {
          color: rgba(14, 40, 69, 0.62);
          font-size: 0.75rem;
          line-height: 1.3;
        }

        .journey-phone {
          position: relative;
          z-index: 1;
          justify-self: center;
          width: min(100%, 208px);
          aspect-ratio: 9 / 16;
          padding: 8px;
          border: 3px solid #a46a19;
          border-radius: 30px;
          background: #0d243a;
          box-shadow:
            0 20px 34px rgba(18, 61, 105, 0.22),
            inset 0 0 0 1px rgba(255, 255, 255, 0.2);
          transform: rotate(1.5deg);
        }

        .journey-phone-island {
          position: absolute;
          z-index: 4;
          top: 12px;
          left: 50%;
          width: 66px;
          height: 18px;
          border-radius: 999px;
          background: #080b0f;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.05),
            0 2px 7px rgba(3, 10, 17, 0.34);
          pointer-events: none;
          transform: translateX(-50%);
        }

        .journey-phone-island::before {
          content: "";
          position: absolute;
          top: 50%;
          right: 7px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #31516d 0 14%, #13283b 36%, #05080c 72%);
          box-shadow: inset 0 0 2px rgba(100, 164, 214, 0.38);
          transform: translateY(-50%);
        }

        .journey-phone-island::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 10px;
          width: 34px;
          height: 5px;
          border-radius: 999px;
          background: rgba(32, 39, 47, 0.58);
          transform: translateY(-50%);
        }

        .journey-phone-screen {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 22px;
          background: #143550;
        }

        .journey-phone-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 58%;
          filter: brightness(1.08);
        }

        .journey-phone-mute:focus-visible {
          outline: 3px solid rgba(255, 255, 255, 0.9);
          outline-offset: 3px;
        }

        .journey-phone-mute {
          position: absolute;
          z-index: 2;
          right: 14px;
          bottom: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 1px solid rgba(255, 255, 255, 0.62);
          border-radius: 50%;
          background: rgba(7, 24, 41, 0.5);
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .journey-phone-mute:hover,
        .journey-phone-mute:focus-visible {
          background: rgba(7, 24, 41, 0.76);
          transform: scale(1.06);
        }

        .journey-phone-mute svg {
          width: 18px;
          height: 18px;
        }

        .journey-phone-home {
          position: absolute;
          z-index: 3;
          bottom: 9px;
          left: 50%;
          width: 42px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.42);
          transform: translateX(-50%);
        }

        .home-destination-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .home-destination-card {
          position: relative;
          isolation: isolate;
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 26px 52px rgba(18, 61, 105, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .home-destination-card.destination-card-1,
        .home-destination-card.destination-card-4 {
          grid-column: span 1;
          min-height: 320px;
        }

        .home-destination-card.destination-card-5 {
          background:
            linear-gradient(160deg, rgba(12, 34, 61, 0.14), rgba(12, 34, 61, 0.62)),
            url("/images/nha-trang-n.jpg") center 35%/cover,
            linear-gradient(135deg, #4f7193, #173253);
        }

        .home-destination-card.destination-card-6 {
          background:
            linear-gradient(160deg, rgba(12, 34, 61, 0.12), rgba(12, 34, 61, 0.54)),
            url("/images/hue.jpg") center 62%/160% auto no-repeat,
            linear-gradient(135deg, #8a6947, #16395d);
        }

        .home-destination-card.destination-card-6::after {
          background: linear-gradient(
            180deg,
            rgba(7, 24, 41, 0.02) 12%,
            rgba(7, 24, 41, 0.14) 40%,
            rgba(7, 24, 41, 0.42) 72%,
            rgba(7, 24, 41, 0.74) 100%
          );
        }

        .home-destination-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.14), transparent 28%),
            radial-gradient(circle at 82% 0%, rgba(245, 209, 141, 0.12), transparent 24%);
          pointer-events: none;
          z-index: 0;
        }

        .home-destination-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(7, 24, 41, 0.04) 12%,
            rgba(7, 24, 41, 0.24) 40%,
            rgba(7, 24, 41, 0.64) 72%,
            rgba(7, 24, 41, 0.88) 100%
          );
          pointer-events: none;
          z-index: 0;
        }

        .home-destination-overlay {
          position: relative;
          z-index: 1;
          padding: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 24%),
            linear-gradient(180deg, rgba(8, 28, 48, 0) 18%, rgba(8, 28, 48, 0.26) 58%, rgba(8, 28, 48, 0.52) 100%);
        }

        .home-destination-top {
          gap: 18px;
          align-items: flex-start;
        }

        .home-destination-top > div {
          min-width: 0;
        }

        .home-destination-top strong {
          display: block;
          margin-bottom: 6px;
          color: rgba(255, 252, 246, 1);
          font-size: clamp(1.34rem, 1.7vw, 1.62rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          white-space: nowrap;
          text-shadow: 0 6px 20px rgba(7, 24, 41, 0.24);
        }

        .home-destination-top p {
          margin: 0;
          color: rgba(250, 246, 239, 0.94);
          line-height: 1.55;
          text-shadow: 0 4px 14px rgba(7, 24, 41, 0.2);
        }

        .home-destination-card .pill {
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: linear-gradient(
            135deg,
            rgba(11, 38, 66, 0.54),
            rgba(255, 255, 255, 0.14)
          );
          color: rgba(255, 251, 244, 0.98);
          white-space: nowrap;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 10px 22px rgba(7, 24, 41, 0.16);
          backdrop-filter: blur(8px);
        }

        .home-destination-bottom {
          display: grid;
          gap: 16px;
        }

        .home-destination-bottom h3 {
          margin-bottom: 0;
          color: #fff1c3;
          font-size: clamp(1.65rem, 2.8vw, 2.22rem);
          line-height: 1;
          letter-spacing: -0.04em;
          text-shadow: 0 8px 24px rgba(7, 24, 41, 0.28);
        }

        .home-destination-list {
          display: grid;
          gap: 10px;
          padding: 16px 18px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(
            180deg,
            rgba(9, 31, 52, 0.18),
            rgba(9, 31, 52, 0.44)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 16px 30px rgba(7, 24, 41, 0.14);
          backdrop-filter: blur(8px);
        }

        .home-destination-list li {
          color: rgba(255, 248, 239, 0.98);
          text-shadow: 0 3px 12px rgba(7, 24, 41, 0.18);
        }

        .home-destination-list li::before {
          box-shadow: 0 0 0 4px rgba(245, 209, 141, 0.08);
        }

        @media (max-width: 1180px) {
          .home-hero-grid {
            grid-template-columns: 1fr;
            gap: 34px;
          }

          .command-grid {
            grid-template-columns: 1fr;
          }

          .command-side {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .support-channel-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-hero-copy {
            padding-bottom: 0;
          }

          .home-hero-panel-stack {
            padding-top: 0;
          }

          .home-hero-copy h1 {
            max-width: 14.8ch;
          }

          .home-destination-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-latest-articles-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-promo-card-copy {
            max-width: calc(100% - 138px);
          }

          .home-promo-card-media {
            right: 22px;
            bottom: 38px;
            width: 120px;
            height: 180px;
          }
        }

        @media (max-width: 820px) {
          .command-metrics,
          .command-side {
            grid-template-columns: 1fr;
          }

          .editorial-grid {
            grid-template-columns: 1fr;
          }

          .ops-strip-grid {
            grid-template-columns: 1fr;
          }

          .home-quick-section {
            padding-top: 40px;
          }

          .support-channel-grid {
            grid-template-columns: 1fr;
          }

          .section {
            padding: 64px 0;
          }

          .section-heading {
            margin-bottom: 28px;
          }

          .home-hero-section {
            padding: 40px 0 28px;
          }

          .home-promo-card {
            min-height: 304px;
          }

          .home-promo-card-copy {
            max-width: calc(100% - 132px);
          }

          .home-promo-card-media {
            bottom: 32px;
          }

          .home-hero-copy {
            gap: 18px;
            padding: 12px 0 4px;
          }

          .home-hero-copy h1 {
            max-width: none;
            font-size: clamp(2.2rem, 6.1vw, 2.86rem);
            line-height: 1.05;
          }

          .home-hero-actions {
            margin-top: 0;
          }

          .home-hero-search-shell .search-panel {
            padding: 24px;
            border-radius: 24px;
          }

          .home-hero-search-shell .search-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .home-hero-search-shell .search-footer > .button-primary {
            flex: 0 0 auto;
            width: 100%;
          }

          .home-hero-search-shell .toggle-group {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            padding: 6px;
            border-radius: 22px;
            overflow: hidden;
          }

          .home-hero-search-shell .toggle {
            min-height: 46px;
            padding: 10px 12px;
            border-radius: 16px;
            line-height: 1.3;
            white-space: normal;
            overflow-wrap: anywhere;
            text-wrap: balance;
          }

          .home-hero-search-shell .toggle:last-child {
            grid-column: 1 / -1;
          }

          .journey-showcase {
            grid-template-columns: minmax(0, 1fr) minmax(150px, 0.58fr);
            gap: 18px;
            padding: 24px;
          }

          .home-destination-overlay {
            padding: 24px;
          }

          .home-latest-articles-section {
            padding-top: 20px;
          }

          .home-latest-articles-head {
            margin-bottom: 24px;
          }

          .home-latest-articles-title {
            align-items: flex-start;
          }

          .home-latest-articles-title h2 {
            font-size: clamp(1.58rem, 5.4vw, 2.02rem);
          }

          .home-latest-articles-head p {
            font-size: 0.96rem;
          }

          .home-latest-articles-grid {
            gap: 18px;
          }
        }

        @media (max-width: 520px) {
          .home-hero-copy h1 {
            font-size: clamp(1.72rem, 7vw, 1.98rem);
            line-height: 1.08;
            letter-spacing: -0.028em;
          }

          .home-hero-copy > p {
            font-size: 0.94rem;
            line-height: 1.68;
          }

          .home-hero-eyebrow {
            min-height: 34px;
            padding: 0 12px;
          }

          .home-hero-primary,
          .home-hero-secondary {
            min-height: 52px;
          }

          .home-hero-stat-grid {
            gap: 14px;
          }

          .home-hero-search-shell .toggle-group {
            grid-template-columns: 1fr;
          }

          .home-hero-search-shell .toggle:last-child {
            grid-column: auto;
          }

          .home-destination-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .home-destination-card {
            border-radius: 26px;
          }

          .home-destination-overlay {
            padding: 20px;
          }

          .home-latest-articles-grid {
            grid-template-columns: 1fr;
          }

          .home-latest-article-card:nth-child(n + 4) {
            display: none;
          }

          .home-latest-article-card {
            gap: 14px;
          }

          .home-latest-article-copy {
            padding: 16px 18px 20px;
          }

          .home-latest-article-copy h3 {
            overflow-wrap: anywhere;
          }

          .home-latest-articles-cta {
            margin-top: 26px;
          }

          .home-latest-articles-button {
            width: 100%;
            padding: 0 22px;
          }

          .journey-showcase {
            grid-template-columns: 1fr;
            gap: 22px;
            padding: 22px;
          }

          .journey-phone {
            width: min(100%, 210px);
          }

          /* Đưa ảnh xuống thành một vùng riêng để tiêu đề và mô tả không
             bị ép vào khoảng trống bên phải trên màn hình hẹp. */
          .home-promo-card {
            min-height: 0;
            padding: 0;
            overflow: hidden;
          }

          .home-promo-card-copy {
            max-width: none;
            padding: 20px 20px 16px;
          }

          .home-promo-card-media {
            position: relative;
            right: auto;
            bottom: auto;
            width: 100%;
            height: 148px;
            border-radius: 0 0 22px 22px;
          }

          .home-promo-card-image,
          .home-promo-card-media-1 .home-promo-card-image {
            transform: none;
          }
        }

        @media (min-width: 521px) and (max-width: 640px) {
          .home-latest-article-card:nth-child(n + 4) {
            display: none;
          }
        }

        /* Giữ khối thông số gần nội dung trước đó, tránh khoảng trắng kéo dài. */
        .home-prep-section {
          padding-bottom: 28px;
        }

        .home-service-metrics-section {
          padding: 20px 0 28px;
        }
      `}</style>
    </>
  );
}
