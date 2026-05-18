"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { StatusChip } from "@/components/status-chip";

type AuthTabKey = "login" | "register" | "forgot-password";

interface AuthTab {
  href: string;
  label: string;
  key: AuthTabKey;
}

interface AuthStat {
  label: string;
  value: string;
  detail: string;
}

interface AuthSupportItem {
  title: string;
  value: string;
  note: string;
}

interface AuthShellProps {
  activeTab: AuthTabKey;
  eyebrow: string;
  title: string;
  description: string;
  stats: AuthStat[];
  sideTitle: string;
  sideDescription: string;
  trustPoints: string[];
  supportItems: AuthSupportItem[];
  children: ReactNode;
}

const authTabs: AuthTab[] = [
  { href: "/login", label: "Đăng nhập", key: "login" },
  { href: "/register", label: "Tạo tài khoản", key: "register" },
  {
    href: "/forgot-password",
    label: "Quên mật khẩu",
    key: "forgot-password"
  }
];

export function AuthShell({
  activeTab,
  eyebrow,
  title,
  description,
  stats,
  sideTitle,
  sideDescription,
  trustPoints,
  supportItems,
  children
}: AuthShellProps) {
  return (
    <section className="section auth-page">
      <div className="container auth-layout">
        <div className="auth-intro">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="page-title">{title}</h1>
          <p className="page-hero-copy auth-page-copy">{description}</p>

          <div className="auth-stat-grid">
            {stats.map((item) => (
              <article key={item.label} className="hero-stat-card auth-stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          <article className="auth-security-card">
            <div className="auth-security-head">
              <div>
                <span className="pill">Quyền lợi tài khoản</span>
                <h2>{sideTitle}</h2>
              </div>
              <StatusChip tone="success" label="Bảo mật nhiều lớp" />
            </div>
            <p>{sideDescription}</p>
            <ul className="list-clean auth-check-list">
              {trustPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="auth-panel-wrap">
          <nav className="auth-tab-nav" aria-label="Điều hướng xác thực">
            {authTabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={
                  tab.key === activeTab
                    ? "auth-tab-link active"
                    : "auth-tab-link"
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="auth-panel">
            {children}

            <article className="auth-support-box">
              <div className="auth-support-head">
                <div>
                  <span className="section-eyebrow">Hỗ trợ xác minh</span>
                  <h2>Liên hệ hỗ trợ nếu bạn cần kiểm tra lại thông tin tài khoản</h2>
                </div>
                <StatusChip tone="neutral" label="Phục vụ 24/7" />
              </div>

              <div className="auth-support-list">
                {supportItems.map((item) => (
                  <div key={item.title} className="auth-support-item">
                    <span>{item.title}</span>
                    <strong>{item.value}</strong>
                    <p>{item.note}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
