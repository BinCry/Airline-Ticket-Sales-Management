import type { Metadata } from "next";
import { Suspense } from "react";

import "@copilotkit/react-ui/styles.css";

import { BookingCopilotSidebar } from "@/components/booking-copilot-sidebar";
import { ChatbotWidget } from "@/components/chatbot-widget";
import { CopilotProvider } from "@/components/copilot-provider";
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
        <CopilotProvider>
          <div className="site-shell">
            <Suspense>
              <ToastProvider />
            </Suspense>
            <SiteHeader />
            <main className="page-main">{children}</main>
            <SiteFooter />
            <ChatbotWidget />
            <BookingCopilotSidebar />
          </div>
        </CopilotProvider>
      </body>
    </html>
  );
}
