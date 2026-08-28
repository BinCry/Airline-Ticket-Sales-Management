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
        {/* Cột giới thiệu và quyền lợi tài khoản */}
        <div className="auth-intro">
          <div className="auth-intro-header">
            <span className="section-eyebrow">{eyebrow}</span>
            <h1 className="page-title auth-page-title">{title}</h1>
            <p className="page-hero-copy auth-page-copy">{description}</p>
          </div>

          {/* Lưới thông số tiện ích */}
          <div className="auth-stat-grid">
            {stats.map((item) => (
              <article key={item.label} className="hero-stat-card auth-stat-card">
                <span className="auth-stat-label">{item.label}</span>
                <strong className="auth-stat-value">{item.value}</strong>
                <p className="auth-stat-detail">{item.detail}</p>
              </article>
            ))}
          </div>

          {/* Thẻ quyền lợi và bảo mật nhiều lớp */}
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
                <li key={item}>
                  <span className="auth-check-icon" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Khung biểu mẫu và điều hướng tab */}
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

            {/* Chân thẻ hỗ trợ nhanh */}
            <div className="auth-support-compact-footer">
              <div className="auth-support-head-compact">
                <span className="auth-support-tag">Hỗ trợ 24/7</span>
                <span className="auth-support-help-text">
                  Tổng đài: <strong>1900 6868</strong> • Email: <strong>support@vietnam-airlines.vn</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
