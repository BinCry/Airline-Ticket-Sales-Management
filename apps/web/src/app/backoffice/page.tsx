"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BackofficeAccessChip } from "@/components/backoffice-access-chip";
import { SectionHeading } from "@/components/section-heading";
import {
  AUTH_SESSION_UPDATED_EVENT,
  loadValidAuthSession
} from "@/lib/auth-session";
import {
  getAllowedBackofficeModulesByPermissions,
  type BackofficeModuleKey
} from "@/lib/access-control";
import { backofficeModules } from "@/lib/backoffice-content";

const hiddenModuleKeys = new Set<BackofficeModuleKey>(["cms"]);

const releaseNotes = [
  { title: "Đúng quyền", description: "Chỉ mở công cụ bạn được cấp." },
  { title: "An toàn", description: "Kiểm tra quyền trước mỗi thao tác." },
  { title: "Tập trung", description: "Chỉ hiện các phân hệ cần dùng." }
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

    return backofficeModules.filter((module) => {
      return allowedModules.includes(module.key) && !hiddenModuleKeys.has(module.key);
    });
  }, [allowedModules]);

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card page-hero-card-dark">
          <div>
            <span className="section-eyebrow">Điều hành nội bộ</span>
            <h1 className="page-title">Trung tâm vận hành nội bộ</h1>
            <p className="page-hero-copy">
              Các công cụ hiển thị theo quyền truy cập của bạn.
            </p>
          </div>
          <div className="page-hero-stat-grid">
            {releaseNotes.map((item) => (
              <article key={item.title} className="page-hero-stat dark-stat">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="section-gap" />
        <SectionHeading
          eyebrow="Phân hệ nội bộ"
          title="Công cụ của bạn"
          description="Chọn một phân hệ để bắt đầu."
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
                  <BackofficeAccessChip moduleKey={module.key as BackofficeModuleKey} />
                  <strong>↗</strong>
                </div>
                <h3>{module.title}</h3>
                <p>{module.summary}</p>
                <span className="module-card-link">
                  Mở phân hệ <span aria-hidden="true">→</span>
                </span>
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
