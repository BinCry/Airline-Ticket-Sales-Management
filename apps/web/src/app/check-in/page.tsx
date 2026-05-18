import { Suspense } from "react";

import { CheckInPageClient } from "@/components/check-in-page-client";

function CheckInFallback() {
  return (
    <section className="section">
      <div className="container">
        <article className="surface-card booking-empty-card">
          <span className="section-eyebrow">Đang tải</span>
          <h1 className="page-title">Đang mở làm thủ tục trực tuyến</h1>
          <p>Vui lòng chờ trong giây lát để nạp danh sách vé đủ điều kiện làm thủ tục.</p>
        </article>
      </div>
    </section>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<CheckInFallback />}>
      <CheckInPageClient />
    </Suspense>
  );
}
