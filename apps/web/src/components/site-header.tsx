"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAuthSession } from "@/lib/auth-api";
import {
  AUTH_SESSION_UPDATED_EVENT,
  clearStoredAuthSession,
  loadValidAuthSession,
  type AuthSession
} from "@/lib/auth-session";
import { hasAnyBackofficeAccess, ROLE_LABELS } from "@/lib/access-control";
import { getApiBaseUrl } from "@/lib/api-client";
import { buildMainNavigation, isMainNavigationLinkActive } from "@/lib/site-navigation";
import { Drawer } from "@/components/ui/overlays";

const DEFAULT_AVATAR_URL = "/images/default-avatar.svg";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function resolveAvatarUrl(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl;
  }

  return `${getApiBaseUrl()}${avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsAccountPanelOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileOpen && !isAccountPanelOpen) {
      return;
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (isAccountPanelOpen && !event.target.closest(".account-menu-wrap")) {
        setIsAccountPanelOpen(false);
      }

      if (
        isMobileOpen &&
        !event.target.closest(".nav-cluster") &&
        !event.target.closest(".mobile-drawer-shell") &&
        !event.target.closest(".mobile-menu-button")
      ) {
        setIsMobileOpen(false);
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsAccountPanelOpen(false);
      setIsMobileOpen(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isAccountPanelOpen, isMobileOpen]);

  useEffect(() => {
    function syncAuthSession() {
      setFailedAvatarUrl(null);
      setAuthSession(loadValidAuthSession());
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
  const usesStaffAccountMenu =
    authSession?.user.roles.some(
      (role) => role === "operations_staff" || role === "customer_support"
    ) ?? false;
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
  const accountAvatarUrl = resolveAvatarUrl(authSession?.user.avatarUrl);
  const shouldRenderAccountAvatar =
    accountAvatarUrl !== null && accountAvatarUrl !== failedAvatarUrl;
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
      window.location.assign("/");
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
          aria-haspopup="menu"
          title={accountButtonLabel}
        >
          <span className="account-menu-avatar" aria-hidden="true">
            <img
              className="account-menu-avatar-default"
              src={DEFAULT_AVATAR_URL}
              alt=""
            />
            {shouldRenderAccountAvatar ? (
              <img
                className="account-menu-avatar-custom"
                src={accountAvatarUrl}
                alt=""
                onError={() => setFailedAvatarUrl(accountAvatarUrl)}
              />
            ) : null}
          </span>
          <span className="account-menu-name">{accountButtonLabel}</span>
        </button>
        {isAccountPanelOpen ? (
          <div id={panelId} className="account-menu-panel" role="menu">
            <div className="account-menu-identity">
              <span className="account-menu-avatar account-menu-avatar-large" aria-hidden="true">
                <img
                  className="account-menu-avatar-default"
                  src={DEFAULT_AVATAR_URL}
                  alt=""
                />
                {shouldRenderAccountAvatar ? (
                  <img
                    className="account-menu-avatar-custom"
                    src={accountAvatarUrl}
                    alt=""
                    onError={() => setFailedAvatarUrl(accountAvatarUrl)}
                  />
                ) : null}
              </span>
              <div>
                <strong>{authSession.user.displayName}</strong>
                <span>{authSession.user.email}</span>
                <small>{primaryRoleLabel ?? "Khách hàng"}</small>
              </div>
            </div>
            {usesStaffAccountMenu ? (
              <div className="account-menu-group">
                <Link href="/account" prefetch={false} role="menuitem">
                  Thông tin cá nhân
                </Link>
                {canOpenBackoffice ? (
                  <Link href="/backoffice" prefetch={false} role="menuitem">
                    Backoffice
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <div className="account-menu-group">
                  <Link href="/account" prefetch={false} role="menuitem">
                    Thông tin cá nhân
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
                    <Link href="/backoffice" prefetch={false} role="menuitem">
                      Backoffice
                    </Link>
                  ) : null}
                </div>
              </>
            )}
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
      <div className="container nav-row nav-row-compact">
        <Link href="/" className="brand" aria-label="Vietnam Airlines - Trang chủ">
          <span className="brand-logo">
            <Image
              src="/images/logo-vietnamairlines.jpg"
              alt=""
              width={1086}
              height={159}
              sizes="(max-width: 640px) 184px, 230px"
              unoptimized
              priority
            />
          </span>
        </Link>

        <nav className="main-nav desktop-main-nav" aria-label="Điều hướng chính">
          {navigationLinks.map((link) => {
            const isActive = isMainNavigationLinkActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? "nav-link active" : "nav-link"}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="nav-row-actions">
          <span className="nav-language-control" aria-label="Ngôn ngữ hiện tại: Tiếng Việt">
            <span aria-hidden="true" className="nav-language-short">VI</span>
            <span aria-hidden="true" className="nav-language-full">Tiếng Việt</span>
          </span>
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
              prefetch={false}
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
            aria-controls="site-mobile-drawer"
            aria-label={isMobileOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          >
            <MenuIcon open={isMobileOpen} />
            <span>Menu</span>
          </button>
        </div>
      </div>

      <Drawer
        open={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        labelId="site-mobile-menu-title"
      >
        <div id="site-mobile-drawer" className="mobile-drawer-shell">
          <div className="mobile-drawer-heading">
            <div>
              <span className="section-eyebrow">Vietnam Airlines</span>
              <h2 id="site-mobile-menu-title">Điều hướng</h2>
            </div>
            <button
              type="button"
              className="icon-button mobile-drawer-close"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Đóng menu điều hướng"
            >
              <MenuIcon open />
            </button>
          </div>

          <nav className="mobile-drawer-nav" aria-label="Điều hướng chính trên di động">
            {navigationLinks.map((link) => {
              const isActive = isMainNavigationLinkActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive ? "mobile-drawer-link active" : "mobile-drawer-link"}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <a className="mobile-drawer-support" href="tel:19006868">
            <span>Trung tâm hỗ trợ</span>
            <strong>1900 6868</strong>
          </a>

          <div className="mobile-drawer-actions">
            {accountButtonLabel ? (
              <div className="mobile-drawer-account">{renderAccountPanel("mobile")}</div>
            ) : (
              <>
                <Link href="/login" className="button button-secondary">Đăng nhập</Link>
                <Link href="/register" className="button button-secondary">Tạo tài khoản</Link>
              </>
            )}
            {canOpenBackoffice ? (
              <Link href="/backoffice" prefetch={false} className="button button-secondary">
                Backoffice
              </Link>
            ) : null}
            <Link href="/booking" className="button button-primary">Đặt vé</Link>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
