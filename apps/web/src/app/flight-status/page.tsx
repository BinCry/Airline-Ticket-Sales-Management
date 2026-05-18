import Link from "next/link";
import type { ApiFlightStatusResponse } from "@qlvmb/shared-types";

import { SectionHeading } from "@/components/section-heading";
import { StatusChip } from "@/components/status-chip";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { fetchFlightStatus, taoDuongDanTinhTrangChuyenBay } from "@/lib/flight-status-api";

export const dynamic = "force-dynamic";

interface FlightStatusPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const toneMap = {
  scheduled: "neutral",
  on_time: "success",
  boarding: "info",
  delayed: "warning",
  departed: "neutral",
  landed: "success",
  cancelled: "danger"
} as const;

function layGiaTriDauTien(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function dinhDangNgayGio(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

export default async function FlightStatusPage({ searchParams }: FlightStatusPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const code = layGiaTriDauTien(resolvedSearchParams.code).trim().toUpperCase();
  const date = layGiaTriDauTien(resolvedSearchParams.date).trim();
  let errorMessage: string | null = null;
  let data: ApiFlightStatusResponse | null = null;

  try {
    data = await fetchFlightStatus({ code, date });
  } catch (error) {
    errorMessage = resolveApiClientErrorMessage(error, "Không thể tải tình trạng chuyến bay lúc này.");
  }

  const flights = data?.flights ?? [];

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card">
          <div>
            <span className="section-eyebrow">Tình trạng chuyến bay</span>
            <h1 className="page-title">Theo dõi giờ bay, cửa ra tàu và trạng thái mới nhất của chuyến bay.</h1>
            <p className="page-hero-copy">
              Nhập mã chuyến bay hoặc chọn ngày để kiểm tra lịch khởi hành, giờ đến và thông tin cần chuẩn bị trước khi ra sân bay.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Tra cứu nhanh</span>
            <h3>VN5201</h3>
            <p>Tuyến Thành phố Hồ Chí Minh - Hà Nội ngày 23/05/2026.</p>
            <Link href={taoDuongDanTinhTrangChuyenBay({ code: "VN5201", date: "2026-05-23" })} className="button button-secondary">
              Tra cứu nhanh
            </Link>
          </div>
        </div>

        <div className="section-gap" />
        <form className="lookup-card" action="/flight-status">
          <div className="field-grid compact-grid">
            <label className="field">
              <span>Mã chuyến bay</span>
              <input name="code" defaultValue={code} placeholder="Ví dụ: VN5201" />
            </label>
            <label className="field">
              <span>Ngày bay</span>
              <input name="date" defaultValue={date} type="date" />
            </label>
            <button className="button button-primary" type="submit">
              Tra cứu chuyến bay
            </button>
          </div>
        </form>

        <div className="section-gap" />
        <SectionHeading
          eyebrow={code ? "Kết quả tra cứu" : "Chuyến bay sắp khởi hành"}
          title={code ? `Thông tin chuyến bay ${code}` : "Danh sách chuyến bay trong 30 ngày tới"}
          description="Trạng thái được lấy từ lịch bay hiện có, kèm giờ khởi hành, giờ đến và cửa ra tàu dự kiến."
        />

        {errorMessage ? (
          <article className="surface-card">
            <span className="section-eyebrow">Không thể tải dữ liệu</span>
            <h3>Không tải được tình trạng chuyến bay</h3>
            <p>{errorMessage}</p>
          </article>
        ) : flights.length > 0 ? (
          <div className="stack-list">
            {flights.map((flight) => (
              <article key={flight.code} className="surface-card result-card flight-status-card">
                <div className="result-top">
                  <div>
                    <span className="section-eyebrow">Chuyến bay {flight.code}</span>
                    <h3>{flight.from} → {flight.to}</h3>
                    <p>{flight.originCode} đến {flight.destinationCode}</p>
                  </div>
                  <StatusChip tone={toneMap[flight.status]} label={flight.statusLabel} />
                </div>
                <div className="result-grid result-grid-rich">
                  <div>
                    <span>Khởi hành</span>
                    <strong>{dinhDangNgayGio(flight.departureAt)}</strong>
                  </div>
                  <div>
                    <span>Hạ cánh</span>
                    <strong>{dinhDangNgayGio(flight.arrivalAt)}</strong>
                  </div>
                  <div>
                    <span>Cửa ra tàu</span>
                    <strong>{flight.gate}</strong>
                  </div>
                </div>
                <p>{flight.note}</p>
              </article>
            ))}
          </div>
        ) : (
          <article className="surface-card">
            <span className="section-eyebrow">Không có kết quả</span>
            <h3>Không tìm thấy chuyến bay phù hợp</h3>
            <p>Kiểm tra lại mã chuyến bay hoặc chọn ngày khác để tra cứu.</p>
          </article>
        )}
      </div>
    </section>
  );
}
