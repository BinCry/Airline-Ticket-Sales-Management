import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthSessionKeeper } from "@/components/auth-session-keeper";
import { ChatbotWidget } from "@/components/chatbot-widget";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";

import "./globals.css";

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
    <html lang="vi" suppressHydrationWarning>
      <body>
        <div className="site-shell">
          <Suspense>
            <ToastProvider />
          </Suspense>
          <AuthSessionKeeper />
          <SiteHeader />
          <main className="page-main">{children}</main>
          <SiteFooter />
          <ChatbotWidget />
        </div>
      </body>
    </html>
  );
}
