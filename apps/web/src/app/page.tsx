import Link from "next/link";
import Image from "next/image";

import { FlightSearchPanel } from "@/components/flight-search-panel";
import { SectionHeading } from "@/components/section-heading";
import { StatusChip } from "@/components/status-chip";
import {
  HanhLyIcon,
  LamThuTucIcon,
  NangHangGheIcon,
  TroLyHoTroIcon
} from "@/components/utility-icons";
import {
  destinations,
  heroHighlights,
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

function getTienIchIcon(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("hành lý")) return <HanhLyIcon className="tien-ich-icon-svg" />;
  if (normalized.includes("nâng hạng")) return <NangHangGheIcon className="tien-ich-icon-svg" />;
  if (normalized.includes("làm thủ tục")) return <LamThuTucIcon className="tien-ich-icon-svg" />;

  return <TroLyHoTroIcon className="tien-ich-icon-svg" />;
}

const heroStats = [
  { label: "Tỷ lệ lấp đầy trên tuyến trục", value: "92%", detail: "Cập nhật theo tình hình khai thác trong ngày" },
  { label: "Tốc độ xuất vé", value: "Dưới 60 giây", detail: "Sau khi phản hồi thanh toán thành công" },
  { label: "Yêu cầu hỗ trợ đang mở", value: "18", detail: "Ưu tiên phản hồi trong ngày đối với các tình huống cần hỗ trợ gấp" }
];

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

const journeyDeck = [
  {
    eyebrow: "Trải nghiệm hành khách",
    title: "Đặt vé, chuẩn bị hành trình và nhận hỗ trợ trong cùng một trải nghiệm xuyên suốt",
    summary:
      "Khuyến mãi, cẩm nang, thông tin sân bay và gợi ý điểm đến được sắp xếp theo đúng nhu cầu thực tế trước ngày bay."
  },
  {
    eyebrow: "Thông tin trước giờ bay",
    title: "Chuẩn bị hành trình chủ động hơn với những thông tin cần xem ngay trước ngày khởi hành",
    summary:
      "Làm thủ tục trực tuyến, tình trạng chuyến bay, lưu ý hành lý và kênh hỗ trợ được đặt gần nhau để hành khách tra cứu nhanh."
  }
];

const travelServiceMetrics = [
  { label: "Mở làm thủ tục", value: "24 giờ", detail: "Trước giờ khởi hành với chặng nội địa" },
  { label: "Đóng làm thủ tục", value: "60 phút", detail: "Áp dụng cho hành khách khởi hành từ sân bay nội địa" },
  { label: "Giữ chỗ", value: "15 phút", detail: "Sau khi chọn chuyến bay và trước khi hoàn tất thanh toán" }
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

export const revalidate = 604800;

export default async function HomePage() {
  const latestArticleShowcase = await getLatestTravelArticles(4);

  return (
    <>
      <section className="hero-section home-hero-section">
        <div className="container hero-grid home-hero-grid">
          <div className="hero-copy hero-copy-rich home-hero-copy">
            <span className="section-eyebrow home-hero-eyebrow">Vietnam Airlines</span>
            <h1>Đặt vé nội địa linh hoạt, quản lý hành trình thuận tiện từ trước đến sau chuyến bay.</h1>
            <p>
              Tìm chuyến bay theo giờ phù hợp, chọn gói giá rõ quyền lợi, bổ sung
              hành lý hoặc chỗ ngồi, làm thủ tục trực tuyến và nhận hỗ trợ nhanh trong
              cùng một trải nghiệm thống nhất.
            </p>
            <div className="hero-actions home-hero-actions">
              <Link href="/booking" className="button button-primary home-hero-primary">
                Đặt vé ngay
              </Link>
              <Link href="/manage-booking" className="button button-secondary home-hero-secondary">
                Quản lý đặt chỗ
              </Link>
            </div>
            <div className="hero-stat-grid home-hero-stat-grid">
              {heroStats.map((item) => (
                <article key={item.label} className="hero-stat-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
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
            <div className="hero-glass-board home-hero-board">
              <div className="hero-glass-head">
                <span className="pill">Vận hành trực tuyến</span>
                <StatusChip tone="success" label="Ổn định" />
              </div>
              <div className="hero-glass-list">
                {heroHighlights.map((item) => (
                  <article key={item} className="hero-highlight-row">
                    <span className="dot" />
                    <p>{item}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ops-strip">
        <div className="container ops-strip-grid">
          {liveOperations.map((item) => (
            <article key={item.title} className="ops-strip-card">
              <span className="pill">{item.title}</span>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="editorial-grid">
            <div>
              <SectionHeading
                eyebrow="Tiện ích nhanh"
                title="Những tiện ích hành khách cần nhất được đưa lên ngay từ đầu hành trình"
              />
              <div className="quick-grid">
                {quickServices.map((service) => (
                  <Link key={service.title} href={service.href} className="feature-card feature-card-rich tien-ich-card">
                    <span className="pill tien-ich-tag">Tiện ích</span>
                    <div className="tien-ich-icon" aria-hidden="true">
                      {getTienIchIcon(service.title)}
                    </div>
                    <h3 className="tien-ich-title">{service.title}</h3>
                  </Link>
                ))}
              </div>
            </div>
            <div className="spotlight-column">
              {journeyDeck.map((item) => (
                <article key={item.title} className="spotlight-card">
                  <span className="section-eyebrow">{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="diem-den" className="section section-soft home-destination-section">
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
          <div className="card-grid card-grid-3">
            {promotions.map((promotion, index) => {
              const photo = promotionPhotos[index % promotionPhotos.length];

              return (
                <article key={promotion.title} className="surface-card promo-card home-promo-card">
                  <div className="home-promo-card-copy">
                    <span className="pill">{promotion.tag}</span>
                    <h3>{promotion.title}</h3>
                    <p>{promotion.summary}</p>
                    <button type="button" className="text-button">
                      {promotion.cta}
                    </button>
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

      <section className="section section-dark">
        <div className="container">
          <SectionHeading
            eyebrow="Chuẩn bị trước giờ bay"
            title="Những thông tin hành khách nên xem trước khi ra sân bay"
            description="Từ thời gian làm thủ tục, quy định hành lý đến kênh hỗ trợ và tình trạng chuyến bay, mọi thông tin quan trọng đều được gom lại để tra cứu nhanh."
          />
          <div className="command-grid">
            <div className="command-metrics">
              {travelServiceMetrics.map((metric) => (
                <article key={metric.label} className="glass-card metric-card-dark">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <p>{metric.detail}</p>
                </article>
              ))}
            </div>
            <div className="command-side">
              <article className="glass-card command-panel">
                <h3>Hành khách thường quan tâm</h3>
                <div className="role-chip-cloud">
                  {travelerTopics.map((topic) => (
                    <span key={topic} className="role-chip">
                      {topic}
                    </span>
                  ))}
                </div>
                <p>
                  Những mục được tra cứu nhiều nhất trước ngày bay được đưa lên rõ ràng
                  để hành khách không phải tìm qua nhiều lớp điều hướng.
                </p>
              </article>
              <article className="glass-card command-panel">
                <h3>Kênh hỗ trợ đa lớp</h3>
                <div className="support-channel-grid">
                  {supportChannels.map((channel) => (
                    <div key={channel.title} className="support-compact-item">
                      <strong>{channel.title}</strong>
                      <p>{channel.description}</p>
                      <small className="support-compact-channel">{channel.channel}</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
      <style>{`
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
          padding: 72px 0 46px;
          background:
            radial-gradient(circle at 10% 0%, rgba(202, 164, 95, 0.18), transparent 26%),
            radial-gradient(circle at 92% 4%, rgba(24, 92, 150, 0.16), transparent 24%),
            linear-gradient(
              180deg,
              rgba(255, 249, 239, 0.98),
              rgba(243, 247, 251, 0.98) 54%,
              rgba(236, 243, 249, 0.94) 100%
            );
          box-shadow: inset 0 -1px 0 rgba(18, 61, 105, 0.08);
        }

        .home-hero-section::before {
          background:
            radial-gradient(circle at 12% 22%, rgba(210, 176, 105, 0.22), transparent 22%),
            radial-gradient(circle at 84% 12%, rgba(48, 117, 186, 0.22), transparent 18%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 60%);
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
          gap: 16px;
          margin-top: 4px;
        }

        .home-hero-stat-grid .hero-stat-card {
          padding: 20px 22px;
          border-color: rgba(18, 61, 105, 0.12);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96),
            rgba(250, 245, 236, 0.9) 44%,
            rgba(241, 247, 253, 0.9) 100%
          );
          box-shadow: 0 22px 42px rgba(18, 61, 105, 0.1);
        }

        .home-hero-stat-grid .hero-stat-card strong {
          color: rgba(12, 49, 84, 0.98);
        }

        .home-hero-stat-grid .hero-stat-card span,
        .home-hero-stat-grid .hero-stat-card p {
          color: rgba(16, 45, 78, 0.78);
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
          margin-top: 24px;
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

        .home-hero-board {
          padding: 24px 24px 22px;
          border-color: rgba(18, 61, 105, 0.18);
          background: linear-gradient(
            160deg,
            rgba(8, 29, 49, 0.98),
            rgba(15, 50, 82, 0.96) 56%,
            rgba(28, 84, 130, 0.92) 100%
          );
          box-shadow: 0 22px 46px rgba(8, 29, 49, 0.24);
        }

        .home-hero-board .hero-glass-head {
          margin-bottom: 18px;
        }

        .home-hero-board .pill {
          border: 1px solid rgba(225, 195, 129, 0.24);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08),
            rgba(225, 195, 129, 0.18)
          );
          color: rgba(248, 226, 183, 0.98);
        }

        .home-hero-board .hero-highlight-row {
          padding: 10px 0;
        }

        .home-hero-board .hero-highlight-row + .hero-highlight-row {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .home-hero-board .hero-highlight-row p {
          color: rgba(247, 243, 234, 0.92);
        }

        .home-hero-board .dot {
          width: 10px;
          height: 10px;
          background: linear-gradient(135deg, #d8b36b, #f0d89e);
          box-shadow: 0 0 0 4px rgba(216, 179, 107, 0.18);
        }

        .home-destination-section {
          padding-top: 82px;
          background:
            radial-gradient(circle at 8% 14%, rgba(202, 164, 95, 0.14), transparent 22%),
            radial-gradient(circle at 92% 18%, rgba(24, 92, 150, 0.1), transparent 20%),
            linear-gradient(180deg, rgba(252, 248, 241, 0.92), rgba(240, 246, 251, 0.9));
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
        }

        .home-latest-article-card {
          display: grid;
          align-content: start;
          gap: 16px;
          color: inherit;
          text-decoration: none;
        }

        .home-latest-article-media {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1.44;
          border-radius: 24px;
          border: 1px solid rgba(18, 61, 105, 0.08);
          background: linear-gradient(180deg, rgba(230, 239, 248, 0.62), rgba(244, 248, 252, 0.98));
          box-shadow: 0 20px 36px rgba(18, 61, 105, 0.1);
        }

        .home-latest-article-media::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(7, 24, 41, 0) 36%, rgba(7, 24, 41, 0.12) 100%);
          pointer-events: none;
        }

        .home-latest-article-media img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 220ms ease;
        }

        .home-latest-article-card:hover .home-latest-article-media img {
          transform: scale(1.03);
        }

        .home-latest-article-copy {
          display: grid;
          gap: 6px;
          padding: 0 12px;
        }

        .home-latest-article-copy h3 {
          margin: 0;
          color: rgba(7, 29, 50, 0.97);
          font-size: clamp(1.12rem, 1.46vw, 1.28rem);
          line-height: 1.22;
          letter-spacing: -0.024em;
          text-wrap: balance;
        }

        .home-latest-article-copy span,
        .home-latest-article-copy small {
          color: rgba(14, 40, 69, 0.58);
          font-size: 0.94rem;
          font-weight: 600;
          line-height: 1.6;
        }

        .home-latest-articles-cta {
          display: flex;
          justify-content: center;
          margin-top: 34px;
        }

        .home-latest-articles-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 58px;
          padding: 0 30px;
          border-color: rgba(74, 132, 205, 0.12);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(239, 245, 252, 0.94)),
            radial-gradient(circle at top left, rgba(113, 191, 106, 0.08), transparent 20%);
          color: rgba(74, 132, 205, 0.96);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 18px 36px rgba(18, 61, 105, 0.08);
        }

        .home-latest-articles-button span {
          font-size: 1.4rem;
          line-height: 1;
        }

        .ops-strip-card,
        .spotlight-card,
        .feature-card-rich,
        .promo-card,
        .article-card {
          border-color: rgba(18, 61, 105, 0.1);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.96),
              rgba(251, 245, 236, 0.9) 42%,
              rgba(242, 247, 252, 0.92) 100%
            ),
            radial-gradient(circle at top right, rgba(202, 164, 95, 0.12), transparent 28%);
          box-shadow: 0 20px 40px rgba(18, 61, 105, 0.08);
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

          .home-latest-article-card {
            gap: 14px;
          }

          .home-latest-article-copy {
            padding: 0 4px;
          }

          .home-latest-articles-cta {
            margin-top: 26px;
          }

          .home-latest-articles-button {
            width: 100%;
            padding: 0 22px;
          }
        }
      `}</style>
    </>
  );
}
