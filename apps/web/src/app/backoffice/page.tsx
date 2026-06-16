"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import {
  AUTH_SESSION_UPDATED_EVENT,
  loadValidAuthSession
} from "@/lib/auth-session";
import {
  getAllowedBackofficeModulesByPermissions,
  ROLE_LABELS,
  type BackofficeModuleKey
} from "@/lib/access-control";
import { backofficeModules } from "@/lib/backoffice-content";

const releaseNotes = [
  "Mỗi phân hệ chỉ mở khi phiên đăng nhập có đúng quyền tương ứng.",
  "Mọi thao tác nội bộ đều được kiểm tra quyền trước khi xử lý.",
  "Danh sách dưới đây chỉ hiển thị công cụ bạn có thể dùng ngay trong phiên hiện tại."
];

export default function BackofficePage() {
  const [allowedModules, setAllowedModules] = useState<BackofficeModuleKey[] | null>(null);

  useEffect(() => {
    function syncPermissions() {
      const permissions = loadValidAuthSession()?.user.permissions ?? [];
      setAllowedModules(getAllowedBackofficeModulesByPermissions(permissions));
    }

    syncPermissions();
    window.addEventListener("storage", syncPermissions);
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncPermissions);

    return () => {
      window.removeEventListener("storage", syncPermissions);
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncPermissions);
    };
  }, []);

  const visibleModules = useMemo(() => {
    if (allowedModules === null) {
      return [];
    }

    return backofficeModules.filter((module) => allowedModules.includes(module.key));
  }, [allowedModules]);

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card page-hero-card-dark">
          <div>
            <span className="section-eyebrow">Điều hành nội bộ</span>
            <h1 className="page-title">
              Trung tâm backoffice cho bán vé, hỗ trợ khách hàng, tài chính, nội dung và vận hành.
            </h1>
            <p className="page-hero-copy">
              Mỗi người dùng chỉ nhìn thấy những công cụ đang được cấp quyền trong phiên hiện tại để tránh thao tác vượt phạm vi.
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
          title="Công cụ đang khả dụng trong phiên làm việc"
          description="Chỉ các phân hệ được cấp permission mới xuất hiện tại đây."
        />
        {allowedModules === null ? (
          <div className="module-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="surface-card module-card skeleton-card">
                <div className="skeleton-block skeleton-title skeleton-title-small" />
                <div className="skeleton-block skeleton-line" />
                <div className="skeleton-block skeleton-line skeleton-line-short" />
              </article>
            ))}
          </div>
        ) : visibleModules.length > 0 ? (
          <div className="module-grid">
            {visibleModules.map((module) => (
              <Link key={module.key} href={module.href} prefetch={false} className="surface-card module-card">
                <div className="module-card-head">
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
        ) : (
          <article className="surface-card">
            <span className="section-eyebrow">Chưa có quyền truy cập</span>
            <h3>Không có phân hệ nào khả dụng</h3>
            <p>
              Tài khoản hiện tại chưa được cấp quyền backoffice. Hãy dùng tài khoản nhân sự phù hợp để tiếp tục.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
