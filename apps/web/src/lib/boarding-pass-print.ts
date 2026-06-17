import type { ApiBoardingPass, ApiManageBookingSegment } from "@qlvmb/shared-types";

import { formatDateTime } from "@/lib/format";

export interface BoardingPassPrintModel {
  arrivalLabel: string;
  barcode: string;
  boardingTimeLabel: string;
  bookingCode: string;
  departureLabel: string;
  flightLabel: string;
  gate: string;
  passengerName: string;
  printedAtLabel: string;
  routeLabel: string;
  seatNumber: string;
  ticketNumber: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildBoardingPassPrintModel(
  bookingCode: string,
  boardingPass: ApiBoardingPass,
  segment: ApiManageBookingSegment | null,
  printedAt: Date = new Date()
): BoardingPassPrintModel {
  return {
    arrivalLabel: segment ? formatDateTime(segment.arrivalAt) : "Không có dữ liệu",
    barcode: boardingPass.barcode,
    boardingTimeLabel: formatDateTime(boardingPass.boardingTime),
    bookingCode,
    departureLabel: segment ? formatDateTime(segment.departureAt) : "Không có dữ liệu",
    flightLabel: segment ? segment.code : "Chưa xác định",
    gate: boardingPass.gate,
    passengerName: boardingPass.passengerName,
    printedAtLabel: formatDateTime(printedAt),
    routeLabel: segment
      ? `${segment.from} (${segment.originCode}) - ${segment.to} (${segment.destinationCode})`
      : "Chặng bay chưa xác định",
    seatNumber: boardingPass.seatNumber,
    ticketNumber: boardingPass.ticketNumber
  };
}

export function buildBoardingPassPrintHtml(model: BoardingPassPrintModel) {
  const passengerName = escapeHtml(model.passengerName);
  const bookingCode = escapeHtml(model.bookingCode);
  const ticketNumber = escapeHtml(model.ticketNumber);
  const routeLabel = escapeHtml(model.routeLabel);
  const flightLabel = escapeHtml(model.flightLabel);
  const seatNumber = escapeHtml(model.seatNumber);
  const gate = escapeHtml(model.gate);
  const boardingTimeLabel = escapeHtml(model.boardingTimeLabel);
  const barcode = escapeHtml(model.barcode);
  const departureLabel = escapeHtml(model.departureLabel);
  const arrivalLabel = escapeHtml(model.arrivalLabel);
  const printedAtLabel = escapeHtml(model.printedAtLabel);

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Thẻ lên máy bay ${bookingCode}</title>
    <style>
      :root {
        color-scheme: light;
        --surface: #f4f8fb;
        --card: #ffffff;
        --line: #d6e3ee;
        --ink: #0f172a;
        --muted: #486581;
        --accent: #14539a;
        --accent-soft: #e8f1fb;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        background:
          radial-gradient(circle at top left, rgba(20, 83, 154, 0.12), transparent 32%),
          linear-gradient(180deg, #f7fbff 0%, var(--surface) 100%);
        color: var(--ink);
        font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      }

      .ticket {
        width: min(900px, 100%);
        margin: 0 auto;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--card);
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.1);
      }

      .head {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        align-items: flex-start;
        margin-bottom: 24px;
      }

      .eyebrow,
      .meta-label {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 34px;
        line-height: 1.1;
      }

      .subcopy {
        margin-top: 8px;
        color: var(--muted);
        font-size: 15px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
      }

      .route {
        display: grid;
        gap: 10px;
        padding: 18px 20px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: #f8fbfe;
      }

      .route strong {
        font-size: 24px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .cell {
        padding: 16px 18px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: #fff;
      }

      .cell strong {
        display: block;
        font-size: 18px;
      }

      .barcode {
        margin-top: 22px;
        padding: 22px 18px 18px;
        border: 1px dashed rgba(20, 83, 154, 0.34);
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(20, 83, 154, 0.05), rgba(255, 255, 255, 0.96));
      }

      .barcode-visual {
        height: 84px;
        border-radius: 16px;
        background:
          repeating-linear-gradient(
            90deg,
            #0f172a 0 3px,
            transparent 3px 6px,
            #0f172a 6px 7px,
            transparent 7px 10px,
            #0f172a 10px 16px,
            transparent 16px 18px
          );
      }

      .barcode strong {
        display: block;
        margin-top: 14px;
        font-size: 16px;
        letter-spacing: 0.18em;
        word-break: break-all;
      }

      .foot {
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }

      @media print {
        body {
          padding: 0;
          background: #fff;
        }

        .ticket {
          width: 100%;
          border: 0;
          box-shadow: none;
          border-radius: 0;
        }
      }
    </style>
  </head>
  <body>
    <article class="ticket">
      <div class="head">
        <div>
          <span class="eyebrow">Vietnam Airlines</span>
          <h1>Thẻ lên máy bay</h1>
          <p class="subcopy">Mã đặt chỗ ${bookingCode} • In lúc ${printedAtLabel}</p>
        </div>
        <span class="pill">Ghế ${seatNumber}</span>
      </div>

      <section class="route">
        <span class="meta-label">Chặng bay</span>
        <strong>${routeLabel}</strong>
        <p>Chuyến bay ${flightLabel} • Khởi hành ${departureLabel} • Dự kiến đến ${arrivalLabel}</p>
      </section>

      <section class="grid">
        <div class="cell">
          <span class="meta-label">Hành khách</span>
          <strong>${passengerName}</strong>
        </div>
        <div class="cell">
          <span class="meta-label">Số vé</span>
          <strong>${ticketNumber}</strong>
        </div>
        <div class="cell">
          <span class="meta-label">Cửa ra tàu</span>
          <strong>${gate}</strong>
        </div>
        <div class="cell">
          <span class="meta-label">Giờ boarding</span>
          <strong>${boardingTimeLabel}</strong>
        </div>
      </section>

      <section class="barcode">
        <span class="meta-label">Barcode</span>
        <div class="barcode-visual" aria-hidden="true"></div>
        <strong>${barcode}</strong>
      </section>

      <p class="foot">Lưu file dưới dạng PDF từ hộp thoại in của trình duyệt để sử dụng khi cần.</p>
    </article>
  </body>
</html>`;
}
