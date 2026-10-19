import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthSessionKeeper } from "@/components/auth-session-keeper";
import { ChatbotWidget } from "@/components/chatbot-widget";
import { RouteFocusManager } from "@/components/route-focus-manager";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";
import {RealtimeNotificationKeeper} from "@/components/realtime-notification-keeper";

import "./globals.css";
import "../styles/shell.css";
import "../styles/journey.css";
import "../styles/content.css";

export const metadata: Metadata = {
  title: "Vietnam Airlines",
  description:
    "Website bán vé máy bay nội địa với tra cứu chuyến bay, quản lý đặt chỗ, làm thủ tục trực tuyến và hỗ trợ hành khách.",
  icons: {
    icon: [
      {
        url: "/images/logo-tab.png",
        sizes: "1200x1200",
        type: "image/png"
      }
    ],
    shortcut: ["/images/logo-tab.png"],
    apple: [
      {
        url: "/images/logo-tab.png",
        sizes: "1200x1200",
        type: "image/png"
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Chuyển đến nội dung chính
        </a>
        <div className="site-shell">
          <Suspense>
            <ToastProvider />
          </Suspense>
          <AuthSessionKeeper />
          <RealtimeNotificationKeeper />
          <RouteFocusManager />
          <SiteHeader />
          <main id="main-content" className="page-main" tabIndex={-1}>{children}</main>
          <SiteFooter />
          <ChatbotWidget />
        </div>
      </body>
    </html>
  );
}
