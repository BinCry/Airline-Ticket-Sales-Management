"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
import {fetchMyNotifications} from "@/lib/my-account-api";
import {FLIGHT_NOTIFICATION_EVENT} from "@/components/realtime-notification-keeper";

const DEFAULT_AVATAR_URL = "/images/default-avatar.svg";
const HOLO_CRAFT_URL = "https://holo-craft.bincrydev.id.vn/";

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

function HoloCraftLink({
  className,
  onClick
}: {
  className: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={HOLO_CRAFT_URL}
      className={className}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Mở HoloCraft 3D trong tab mới"
      title="Mở HoloCraft 3D trong tab mới"
      onClick={onClick}
    >
      <svg className="holocraft-link-cube" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m4.4 7.7 7.6 4.3 7.6-4.3M12 12v9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      <span className="holocraft-link-copy">
        <span className="holocraft-link-name">HoloCraft</span>
        <span className="holocraft-link-badge" aria-hidden="true">3D</span>
      </span>
      <svg className="holocraft-link-external" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M11 4h5v5M16 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11v4H5V6h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
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
  const [unreadCount,setUnreadCount]=useState(0);
  useEffect(()=>{
    const sync=()=>{
      if(!authSession?.accessToken){setUnreadCount(0);return;}
      void fetchMyNotifications(authSession.accessToken).then(items=>setUnreadCount(items.filter(n=>!n.readAt).length)).catch(()=>{});
    };
    sync();window.addEventListener(FLIGHT_NOTIFICATION_EVENT,sync);
    return ()=>window.removeEventListener(FLIGHT_NOTIFICATION_EVENT,sync);
  },[authSession?.accessToken]);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeMobileMenu() {
    setIsMobileOpen(false);
    setIsAccountPanelOpen(false);
  }

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

      if (
        isAccountPanelOpen &&
        !event.target.closest(".account-menu-wrap") &&
        !(isMobileOpen && event.target.closest(".ui-overlay-surface"))
      ) {
        setIsAccountPanelOpen(false);
      }

      if (
        isMobileOpen &&
        !event.target.closest(".nav-cluster") &&
        !event.target.closest(".mobile-drawer-shell") &&
        !event.target.closest(".ui-overlay-surface") &&
        !event.target.closest(".mobile-menu-button")
      ) {
        closeMobileMenu();
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      closeMobileMenu();
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
  const isBookingJourney =
    pathname === "/" ||
    pathname === "/search" ||
    pathname === "/booking" ||
    pathname.startsWith("/booking/");
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
                  <Link href="/account#thong-bao" role="menuitem">
                    Thông báo chuyến bay
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
        <div className="nav-brand-stack">
          <Link href="/" className="brand" aria-label="Vietnam Airlines - Trang chủ">
            <span className="brand-logo">
              <Image
                src="/images/logo-vietnamairlines.jpg"
                alt=""
                width={1086}
                height={159}
                sizes="(max-width: 640px) 164px, 230px"
                unoptimized
                priority
              />
            </span>
          </Link>
        </div>

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
          <HoloCraftLink className="nav-link nav-link-holocraft" />
        </nav>

        <div className="nav-row-actions">
          <span className="nav-language-control" aria-label="Ngôn ngữ hiện tại: Tiếng Việt">
            <span className="nav-language-full">Tiếng Việt</span>
            <span className="nav-language-short" aria-hidden="true">VI</span>
          </span>
          {accountButtonLabel && !isStaffRole ? <Link href="/account#thong-bao" className="button button-secondary nav-action-button" aria-label={`Thông báo, ${unreadCount} chưa đọc`}>
            🔔 {unreadCount > 0 ? unreadCount : ""}
          </Link> : null}
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
          {!isBookingJourney ? (
            <Link
              href="/search"
              className="button button-primary nav-action-button"
            >
              Đặt vé
            </Link>
          ) : null}
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-button"
            onClick={() => {
              if (isMobileOpen) {
                closeMobileMenu();
              } else {
                setIsMobileOpen(true);
              }
            }}
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
        onClose={closeMobileMenu}
        labelId="site-mobile-menu-title"
        returnFocusRef={menuButtonRef}
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
              onClick={closeMobileMenu}
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
            <HoloCraftLink
              className="mobile-drawer-link mobile-drawer-link-holocraft"
              onClick={closeMobileMenu}
            />
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
            <Link href="/search" className="button button-primary">Đặt vé</Link>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
