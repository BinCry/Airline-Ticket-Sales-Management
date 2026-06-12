"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAuthSession } from "@/lib/auth-api";
import {
  AUTH_SESSION_UPDATED_EVENT,
  clearStoredAuthSession,
  loadActiveAuthSession,
  type AuthSession
} from "@/lib/auth-session";
import { hasAnyBackofficeAccess, ROLE_LABELS } from "@/lib/access-control";
import { utilityLinks } from "@/lib/public-content";
import { buildMainNavigation, isMainNavigationLinkActive } from "@/lib/site-navigation";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsAccountPanelOpen(false);
  }, [pathname]);

  useEffect(() => {
    function syncAuthSession() {
      setAuthSession(loadActiveAuthSession());
    }

    syncAuthSession();
    window.addEventListener("storage", syncAuthSession);
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncAuthSession);

    return () => {
      window.removeEventListener("storage", syncAuthSession);
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncAuthSession);
    };
  }, [pathname]);

  const accountDisplayName = authSession?.user.displayName ?? null;
  const primaryRole = authSession?.user.roles[0] ?? null;
  const isStaffRole =
    primaryRole === "customer_support" || primaryRole === "operations_staff";
  const shortStaffLabelByRole: Record<string, string> = {
    customer_support: "CSKH",
    operations_staff: "Vận hành"
  };
  const primaryRoleLabel =
    primaryRole && primaryRole in ROLE_LABELS
      ? ROLE_LABELS[primaryRole as keyof typeof ROLE_LABELS]
      : null;
  const shortStaffLabel =
    primaryRole && primaryRole in shortStaffLabelByRole
      ? shortStaffLabelByRole[primaryRole]
      : null;
  const accountButtonLabel =
    accountDisplayName
      ? (isStaffRole ? (shortStaffLabel ?? primaryRoleLabel ?? accountDisplayName) : accountDisplayName)
      : null;
  const accountInitial = accountDisplayName?.slice(0, 1).toUpperCase() ?? "?";
  const permissions = authSession?.user.permissions ?? [];
  const canOpenBackoffice = hasAnyBackofficeAccess(permissions);
  const navigationLinks = buildMainNavigation(permissions).filter(
    (link) => !(canOpenBackoffice && link.href === "/backoffice")
  );
  const headerClassName = isStaffRole ? "site-header site-header-staff" : "site-header";

  async function handleAccountLogout() {
    if (!authSession || isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logoutAuthSession(authSession.refreshToken);
    } finally {
      clearStoredAuthSession();
      setAuthSession(null);
      setIsAccountPanelOpen(false);
      setIsLoggingOut(false);
      router.push("/");
    }
  }

  function renderAccountPanel(placement: "desktop" | "mobile") {
    if (!authSession || !accountButtonLabel) {
      return null;
    }

    const panelId = `account-panel-${placement}`;

    return (
      <div className="account-menu-wrap">
        <button
          type="button"
          className="button button-secondary nav-account-button account-menu-trigger"
          onClick={() => setIsAccountPanelOpen((value) => !value)}
          aria-expanded={isAccountPanelOpen}
          aria-controls={panelId}
          title={accountButtonLabel}
        >
          <span className="account-menu-avatar" aria-hidden="true">
            {accountInitial}
          </span>
          <span className="account-menu-name">{accountButtonLabel}</span>
        </button>
        {isAccountPanelOpen ? (
          <div id={panelId} className="account-menu-panel" role="menu">
            <div className="account-menu-identity">
              <span className="account-menu-avatar account-menu-avatar-large" aria-hidden="true">
                {accountInitial}
              </span>
              <div>
                <strong>{authSession.user.displayName}</strong>
                <span>{authSession.user.email}</span>
                <small>{primaryRoleLabel ?? "Khách hàng"}</small>
              </div>
            </div>
            <div className="account-menu-group">
              <Link href="/account" role="menuitem">
                Thông tin cá nhân
              </Link>
              <Link href="/account#hanh-khach" role="menuitem">
                Hành khách
              </Link>
              <Link href="/account#thong-bao" role="menuitem">
                Thông báo
              </Link>
              <Link href="/account#voucher" role="menuitem">
                Voucher / Điểm thưởng
              </Link>
            </div>
            <div className="account-menu-group">
              <Link href="/manage-booking" role="menuitem">
                Vé của tôi
              </Link>
              <Link href="/check-in" role="menuitem">
                Làm thủ tục
              </Link>
              <Link href="/flight-status" role="menuitem">
                Trạng thái chuyến bay
              </Link>
              {canOpenBackoffice ? (
                <Link href="/backoffice" role="menuitem">
                  Backoffice
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              className="account-menu-logout"
              onClick={() => void handleAccountLogout()}
              disabled={isLoggingOut}
              role="menuitem"
            >
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <header className={headerClassName}>
      <div className="topbar">
        <div className="container topbar-row">
          <div className="topbar-badges">
            {primaryRoleLabel ? <span className="pill">{primaryRoleLabel}</span> : null}
            <span className="pill">Tiếng Việt</span>
            <span className="pill">
              Đặt vé nội địa, quản lý hành trình và làm thủ tục trực tuyến thuận tiện
            </span>
          </div>
          <nav className="utility-nav" aria-label="Tiện ích nhanh">
            {utilityLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="container nav-row">
        <Link href="/" className="brand">
          <span className="brand-logo">
            <Image
              src="/images/logo-vietnamairlines.jpg"
              alt="Logo Vietnam Airlines"
              width={1086}
              height={159}
              sizes="(max-width: 640px) 248px, 280px"
              unoptimized
              priority
            />
          </span>
        </Link>
        <div className={isMobileOpen ? "nav-cluster mobile-open" : "nav-cluster"}>
          <nav className="main-nav" aria-label="Điều hướng chính">
            {navigationLinks.map((link) => {
              const isActive = isMainNavigationLinkActive(pathname, link);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive ? "nav-link active" : "nav-link"}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="nav-actions-wrap">
            <nav className="mobile-utility-nav" aria-label="Tiện ích nhanh trên di động">
              {utilityLinks.map((link) => (
                <Link key={link.href} href={link.href} className="mobile-utility-link">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="nav-actions">
              <div className="nav-meta nav-meta-mobile">
                <span>Trung tâm hỗ trợ</span>
                <strong>1900 6868</strong>
              </div>
              {accountButtonLabel ? (
                renderAccountPanel("mobile")
              ) : (
                <>
                  <Link href="/login" className="button button-secondary">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="button button-secondary">
                    Tạo tài khoản
                  </Link>
                </>
              )}
              {canOpenBackoffice ? (
                <Link href="/backoffice" className="button button-secondary">
                  Backoffice
                </Link>
              ) : null}
              <Link href="/booking" className="button button-primary">
                Đặt vé
              </Link>
            </div>
          </div>
        </div>
        <div className="nav-row-actions">
          <div className="nav-meta">
            <span>Trung tâm hỗ trợ</span>
            <strong>1900 6868</strong>
          </div>
          {accountButtonLabel ? (
            renderAccountPanel("desktop")
          ) : (
            <>
              <Link
                href="/login"
                className="button button-secondary nav-action-button"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="button button-secondary nav-action-button"
              >
                Tạo tài khoản
              </Link>
            </>
          )}
          {canOpenBackoffice ? (
            <Link
              href="/backoffice"
              className="button button-secondary nav-action-button"
            >
              Backoffice
            </Link>
          ) : null}
          <Link
            href="/booking"
            className="button button-primary nav-action-button"
          >
            Đặt vé
          </Link>
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setIsMobileOpen((value) => !value)}
            aria-expanded={isMobileOpen}
            aria-label="Mở menu điều hướng"
          >
            {isMobileOpen ? "Đóng" : "Menu"}
          </button>
        </div>
      </div>
    </header>
  );
}
