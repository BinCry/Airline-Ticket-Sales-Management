import Image from "next/image";

import { SectionHeading } from "@/components/section-heading";
import { supportChannels, supportFaqs } from "@/lib/public-content";

const airportCards = [
  "Nội Bài: mở quầy trước 2 giờ, khu vực C và D có quầy làm thủ tục tự động.",
  "Tân Sơn Nhất: cập nhật cửa ra tàu theo thời gian thực trên trang tình trạng chuyến bay.",
  "Đà Nẵng: ưu tiên khách có yêu cầu hỗ trợ đặc biệt qua bộ phận chăm sóc khách hàng trước chuyến."
];

const policyCards = [
  {
    id: "dieu-kien-ve",
    title: "Điều kiện vé",
    description: "Kiểm tra hạng vé, thời hạn giữ chỗ, quy định đổi hoặc hoàn trước khi xác nhận thanh toán."
  },
  {
    id: "hanh-ly",
    title: "Hành lý",
    description: "Chuẩn bị hành lý xách tay, hành lý ký gửi và các vật dụng cần khai báo trước khi ra sân bay."
  }
];

export default function SupportPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="support-hero-grid">
          <div className="page-hero-card support-hero-card">
            <div>
              <span className="section-eyebrow">Trung tâm hỗ trợ</span>
              <h1 className="page-title">Hỗ trợ hành khách xuyên suốt từ lúc đặt vé đến sau chuyến bay.</h1>
              <p className="page-hero-copy">
                Trợ lý trực tuyến, tổng đài, biểu mẫu hỗ trợ, câu hỏi thường gặp và
                thông tin sân bay được gom về một nơi để hành khách dễ tra cứu và kết
                nối nhanh với bộ phận chăm sóc khách hàng khi cần.
              </p>
            </div>
            <div className="support-stat-panel">
              <div className="page-hero-stat">
                <span>Thời hạn xử lý ưu tiên</span>
                <strong>25'</strong>
              </div>
              <div className="page-hero-stat">
                <span>Tiếp nhận từ trợ lý hỗ trợ</span>
                <strong>1 chạm</strong>
              </div>
            </div>
          </div>
          <div className="support-media-card">
            <Image
              src="/images/danang-coast.jpg"
              alt="Hình nền du lịch hỗ trợ cho trang chăm sóc khách hàng"
              fill
              sizes="(max-width: 1180px) 100vw, 360px"
            />
            <div className="support-media-overlay">
              <span className="pill">Hỗ trợ hành khách</span>
              <h3>Chuẩn bị trước giờ bay dễ dàng hơn</h3>
              <p>Thông tin sân bay, điều kiện giá vé và các kênh hỗ trợ được trình bày rõ để hành khách chủ động xử lý sớm.</p>
            </div>
          </div>
        </div>

        <div className="section-gap" />
        <div id="lien-he" className="card-grid card-grid-3">
          {supportChannels.map((channel) => (
            <article key={channel.title} className="surface-card promo-card">
              <h3>{channel.title}</h3>
              <p>{channel.description}</p>
              <strong>{channel.channel}</strong>
            </article>
          ))}
        </div>

        <div className="section-gap" />
        <div className="card-grid card-grid-2">
          {policyCards.map((policy) => (
            <article key={policy.id} id={policy.id} className="surface-card">
              <h3>{policy.title}</h3>
              <p>{policy.description}</p>
            </article>
          ))}
        </div>

        <div className="section-gap" />
        <div className="section-split">
          <div id="faq">
            <SectionHeading
              eyebrow="Câu hỏi thường gặp"
              title="Những câu hỏi hành khách thường gặp trước ngày bay"
              description="Câu trả lời rõ ràng giúp hành khách tự xử lý nhanh hơn và giảm thời gian chờ hỗ trợ ở các tình huống quen thuộc."
            />
            <div className="stack-list">
              {supportFaqs.map((faq) => (
                <article key={faq.question} className="surface-card">
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
          <div id="san-bay">
            <SectionHeading
              eyebrow="Thông tin sân bay"
              title="Thông tin cần biết trước khi đến sân bay"
              description="Các lưu ý về quầy làm thủ tục, cửa ra tàu và hỗ trợ đặc biệt giúp hành khách chuẩn bị tốt hơn cho ngày khởi hành."
            />
            <div className="stack-list">
              {airportCards.map((card) => (
                <article key={card} className="surface-card">
                  <p>{card}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
