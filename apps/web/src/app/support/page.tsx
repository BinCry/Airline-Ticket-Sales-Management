import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { SupportFaqSearch } from "@/components/support-faq-search";
import { supportChannels, supportFaqCategories, supportFaqs } from "@/lib/public-content";

const supportActions = [
  {
    href: "/manage-booking",
    title: "Tra cứu đặt chỗ",
    description: "Xem vé, gửi lại email vé và kiểm tra hành trình."
  },
  {
    href: "/check-in",
    title: "Làm thủ tục",
    description: "Mở check-in trực tuyến và xem hướng dẫn trước giờ bay."
  },
  {
    href: "/flight-status",
    title: "Trạng thái chuyến bay",
    description: "Kiểm tra giờ bay, cửa ra tàu và ghi chú vận hành."
  }
];

const supportNotes = [
  {
    id: "dieu-kien-ve",
    title: "Điều kiện vé",
    description:
      "Kiểm tra hạng vé, thời hạn giữ chỗ, quy định đổi hoặc hoàn trước khi xác nhận thanh toán."
  },
  {
    id: "hanh-ly",
    title: "Hành lý",
    description:
      "Chuẩn bị hành lý xách tay, hành lý ký gửi và các vật dụng cần khai báo trước khi ra sân bay."
  },
  {
    id: "noi-bai",
    title: "Nội Bài",
    description: "Mở quầy trước 2 giờ, khu vực C và D có quầy làm thủ tục tự động."
  },
  {
    id: "tan-son-nhat",
    title: "Tân Sơn Nhất",
    description: "Cập nhật cửa ra tàu theo thời gian thực trên trang tình trạng chuyến bay."
  },
  {
    id: "da-nang",
    title: "Đà Nẵng",
    description:
      "Ưu tiên khách có yêu cầu hỗ trợ đặc biệt qua bộ phận chăm sóc khách hàng trước chuyến."
  }
];

export default function SupportPage() {
  return (
    <section className="section">
      <div className="container support-page-stack">
        <div className="page-hero-card support-summary-panel">
          <div className="support-summary-copy">
            <span className="section-eyebrow">Trung tâm hỗ trợ</span>
            <h1 className="page-title">Hỗ trợ</h1>
            <p className="page-hero-copy">
              Chọn nhanh việc cần xử lý hoặc tra cứu câu hỏi thường gặp trước khi liên hệ tổng đài.
            </p>
          </div>

          <nav className="support-action-list" aria-label="Tác vụ hỗ trợ nhanh">
            {supportActions.map((action) => (
              <Link key={action.href} href={action.href} className="support-action-link">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </Link>
            ))}
          </nav>

          <aside className="support-contact-panel" aria-label="Kênh liên hệ">
            <span className="section-eyebrow">Liên hệ</span>
            <h2>Kênh hỗ trợ</h2>
            {supportChannels.map((channel) => (
              <div key={channel.title} className="support-contact-item">
                <div>
                  <h2>{channel.title}</h2>
                  <p>{channel.description}</p>
                </div>
                <strong>{channel.channel}</strong>
              </div>
            ))}
          </aside>
        </div>

        <section id="faq">
          <SectionHeading
            eyebrow="FAQ"
            title="Câu hỏi thường gặp"
            description="Tìm theo từ khóa hoặc nhóm vấn đề để tự xử lý nhanh các tình huống quen thuộc."
          />
          <SupportFaqSearch categories={supportFaqCategories} faqs={supportFaqs} />
        </section>

        <section id="luu-y">
          <SectionHeading
            eyebrow="Lưu ý"
            title="Lưu ý trước giờ bay"
            description="Các thông tin ngắn cần kiểm tra trước khi đổi vé, chuẩn bị hành lý hoặc đến sân bay."
          />
          <div className="stack-list support-note-list">
            {supportNotes.map((note) => (
              <article key={note.id} id={note.id} className="surface-card support-note-card">
                <h3>{note.title}</h3>
                <p>{note.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
