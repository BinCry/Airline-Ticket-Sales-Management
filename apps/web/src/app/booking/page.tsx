import { Suspense } from "react";

import { redirect } from "next/navigation";

import { BookingPageClient } from "@/components/booking-page-client";
import { appendBackofficeSalesFlow, hasBackofficeSalesFlow } from "@/lib/backoffice-sales-flow";
import { parseBookingHandoffState } from "@/lib/booking-flow";

interface BookingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function taoUrlSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string") {
          urlSearchParams.append(key, item);
        }
      });
      continue;
    }

    if (typeof value === "string") {
      urlSearchParams.set(key, value);
    }
  }

  return urlSearchParams;
}

function BookingPageFallback() {
  return (
    <section className="section">
      <div className="container">
        <article className="surface-card booking-empty-card">
          <span className="section-eyebrow">Đang tải</span>
          <h1 className="page-title">Đang mở biểu mẫu đặt vé</h1>
          <p>Vui lòng chờ trong giây lát để nạp lựa chọn chuyến bay bạn vừa chọn.</p>
        </article>
      </div>
    </section>
  );
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const handoffState = parseBookingHandoffState(taoUrlSearchParams(resolvedSearchParams));

  if (!handoffState) {
    const fallbackUrl = "/search?notice=chon-chuyen-bay-truoc&thong-bao=chon-chuyen-bay-truoc#dat-ve";
    redirect(hasBackofficeSalesFlow(resolvedSearchParams) ? appendBackofficeSalesFlow(fallbackUrl) : fallbackUrl);
  }

  return (
    <Suspense fallback={<BookingPageFallback />}>
      <BookingPageClient />
    </Suspense>
  );
}
