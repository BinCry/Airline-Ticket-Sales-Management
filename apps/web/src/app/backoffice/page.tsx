import Link from "next/link";

import { BackofficeAccessChip } from "@/components/backoffice-access-chip";
import { SectionHeading } from "@/components/section-heading";
import { ROLE_LABELS, type BackofficeModuleKey } from "@/lib/access-control";
import { backofficeModules } from "@/lib/backoffice-content";

const releaseNotes = [
  "Backoffice đang trong giai đoạn hoàn thiện theo từng phân hệ.",
  "Mỗi phân hệ chỉ hiển thị thông tin phù hợp với quyền truy cập hiện tại.",
  "Không hiển thị số liệu vận hành mẫu khi chưa có nguồn dữ liệu thật."
];

export default function BackofficePage() {
  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card page-hero-card-dark">
          <div>
            <span className="section-eyebrow">Điều hành nội bộ</span>
            <h1 className="page-title">
              Trung tâm backoffice theo hai vai trò: chăm sóc khách hàng và vận hành.
            </h1>
            <p className="page-hero-copy">
              Khu vực này chỉ hiển thị thông tin đã có dữ liệu thật. Các phân hệ chưa hoàn thiện sẽ
              được giới hạn ở mức mô tả khả năng hiện tại.
            </p>
          </div>
          <div className="page-hero-stat-grid">
            {releaseNotes.map((item) => (
              <article key={item} className="page-hero-stat dark-stat">
                <strong>•</strong>
                <span>{item}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="section-gap" />
        <SectionHeading
          eyebrow="Phân hệ nội bộ"
          title="Danh sách phân hệ theo quyền truy cập"
          description="Mỗi phân hệ được gắn quyền cụ thể để tránh truy cập sai phạm vi."
        />
        <div className="module-grid">
          {backofficeModules.map((module) => (
            <Link key={module.key} href={module.href} className="surface-card module-card">
              <div className="module-card-head">
                <BackofficeAccessChip moduleKey={module.key as BackofficeModuleKey} />
                <span className="pill">Phân khu nội bộ</span>
                <strong>↗</strong>
              </div>
              <h3>{module.title}</h3>
              <p>{module.summary}</p>
              <ul className="list-clean">
                {module.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              <small>
                Vai trò:{" "}
                {module.roles
                  .map((role) => ROLE_LABELS[role as keyof typeof ROLE_LABELS])
                  .join(", ")}
              </small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
