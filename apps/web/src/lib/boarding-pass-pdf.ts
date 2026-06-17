import type { ApiBoardingPass, ApiManageBookingSegment } from "@qlvmb/shared-types";

interface DuLieuXuatPdfTheLenMayBay {
  boardingPass: ApiBoardingPass;
  bookingCode: string;
  segment: ApiManageBookingSegment | null;
}

function thoatHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function dinhDangNgay(value: string | null) {
  if (!value) {
    return "KhÃ´ng cÃ³ dá»¯ liá»‡u";
  }

  const ketQuaTuChuoi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (ketQuaTuChuoi) {
    return `${ketQuaTuChuoi[3]}/${ketQuaTuChuoi[2]}/${ketQuaTuChuoi[1]}`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsedDate);
}

function dinhDangNgayGio(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsedDate);
}

export function taoNoiDungPdfTheLenMayBay({
  boardingPass,
  bookingCode,
  segment
}: DuLieuXuatPdfTheLenMayBay) {
  const maChuyenBay = segment?.code ?? "ChÆ°a xÃ¡c Ä‘á»‹nh";
  const diemDi = segment?.originCode ?? "N/A";
  const diemDen = segment?.destinationCode ?? "N/A";
  const tenTuyenBay = segment ? `${segment.from} - ${segment.to}` : "ChÆ°a xÃ¡c Ä‘á»‹nh";
  const gioKhoiHanh = segment ? dinhDangNgayGio(segment.departureAt) : "KhÃ´ng cÃ³ dá»¯ liá»‡u";
  const gioHaCanh = segment ? dinhDangNgayGio(segment.arrivalAt) : "KhÃ´ng cÃ³ dá»¯ liá»‡u";
  const gioBoarding = dinhDangNgayGio(boardingPass.boardingTime);
  const ngayBay = segment ? dinhDangNgay(segment.departureAt) : dinhDangNgay(boardingPass.boardingTime);

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <title>Thẻ lên máy bay ${thoatHtml(bookingCode)} - ${thoatHtml(boardingPass.ticketNumber)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Tahoma, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 14mm;
      }

      body {
        margin: 0;
        background: #f4f8fb;
        color: #0f172a;
      }

      main {
        width: 100%;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .ve {
        width: min(820px, 100%);
        border-radius: 28px;
        overflow: hidden;
        background: #ffffff;
        border: 1px solid #d6e2ea;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
      }

      .dau {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 28px 32px;
        color: #f8fafc;
        background: linear-gradient(135deg, #0f766e 0%, #0f172a 100%);
      }

      .thuong-hieu {
        font-size: 12px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        opacity: 0.82;
      }

      h1 {
        margin: 10px 0 8px;
        font-size: 32px;
      }

      .phu-de {
        margin: 0;
        font-size: 15px;
        opacity: 0.9;
      }

      .pill {
        align-self: flex-start;
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        background: rgba(248, 250, 252, 0.14);
        border: 1px solid rgba(248, 250, 252, 0.18);
      }

      .noi-dung {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 28px;
        padding: 30px 32px 34px;
      }

      .luoi-thong-tin {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }

      .o {
        padding: 14px 16px;
        border-radius: 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .nhan {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .gia-tri {
        display: block;
        font-size: 20px;
        font-weight: 700;
      }

      .tuyen-bay {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px 20px;
        border-radius: 22px;
        background: linear-gradient(180deg, #ecfeff 0%, #f8fafc 100%);
        border: 1px solid #cfe6eb;
      }

      .tuyen-bay strong {
        display: block;
        font-size: 30px;
      }

      .tuyen-bay small {
        display: block;
        margin-top: 6px;
        color: #475569;
        font-size: 14px;
      }

      .mui-ten {
        font-size: 28px;
        color: #0f766e;
      }

      .ma-vach {
        display: grid;
        gap: 16px;
        align-content: start;
      }

      .khung-ma {
        padding: 20px 18px;
        border-radius: 22px;
        color: #e2e8f0;
        background: #0f172a;
      }

      .khung-ma strong {
        display: block;
        margin-top: 10px;
        font-size: 18px;
        letter-spacing: 0.08em;
      }

      .bar {
        display: grid;
        grid-template-columns: repeat(36, 1fr);
        gap: 3px;
        margin-top: 18px;
        min-height: 112px;
        align-items: end;
      }

      .bar span {
        display: block;
        width: 100%;
        min-height: 52px;
        border-radius: 999px;
        background: #ffffff;
      }

      .bar span.day {
        min-height: 104px;
      }

      .chu-thich {
        margin: 0;
        font-size: 12px;
        line-height: 1.6;
        color: #475569;
      }

      .in {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 16px;
        color: #0f172a;
        background: #ecfeff;
        border: 1px dashed #0f766e;
        font-size: 13px;
      }

      @media print {
        body {
          background: #ffffff;
        }

        main {
          padding: 0;
          min-height: auto;
        }

        .ve {
          width: 100%;
          border: none;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="ve">
        <header class="dau">
          <div>
            <span class="thuong-hieu">The len may bay</span>
            <h1>${thoatHtml(boardingPass.passengerName)}</h1>
            <p class="phu-de">PNR ${thoatHtml(bookingCode)} · Ve ${thoatHtml(boardingPass.ticketNumber)}</p>
          </div>
          <span class="pill">${thoatHtml(maChuyenBay)}</span>
        </header>

        <div class="noi-dung">
          <div>
            <div class="luoi-thong-tin">
              <article class="o">
                <span class="nhan">Ngay bay</span>
                <span class="gia-tri">${thoatHtml(ngayBay)}</span>
              </article>
              <article class="o">
                <span class="nhan">Gio boarding</span>
                <span class="gia-tri">${thoatHtml(gioBoarding)}</span>
              </article>
              <article class="o">
                <span class="nhan">Ghe</span>
                <span class="gia-tri">${thoatHtml(boardingPass.seatNumber)}</span>
              </article>
              <article class="o">
                <span class="nhan">Cua ra tau</span>
                <span class="gia-tri">${thoatHtml(boardingPass.gate)}</span>
              </article>
            </div>

            <article class="tuyen-bay">
              <div>
                <strong>${thoatHtml(diemDi)}</strong>
                <small>${thoatHtml(gioKhoiHanh)}</small>
              </div>
              <div class="mui-ten">→</div>
              <div style="text-align: right;">
                <strong>${thoatHtml(diemDen)}</strong>
                <small>${thoatHtml(gioHaCanh)}</small>
              </div>
            </article>

            <article class="in">
              <strong>${thoatHtml(tenTuyenBay)}</strong><br />
              Máº«u in nÃ y sáºµn sÃ ng Ä‘á»ƒ lÆ°u PDF ngay tá»« há»™p thoáº¡i in cá»§a trÃ¬nh duyá»‡t.
            </article>
          </div>

          <aside class="ma-vach">
            <article class="khung-ma">
              <span class="nhan" style="color: #cbd5e1;">Ma boarding</span>
              <strong>${thoatHtml(boardingPass.barcode)}</strong>
              <div class="bar" aria-hidden="true">
                ${Array.from({ length: 36 }, (_, index) => `<span class="${index % 3 === 0 ? "day" : ""}"></span>`).join("")}
              </div>
            </article>
            <p class="chu-thich">
              Vui lÃ²ng cÃ³ máº·t táº¡i cá»­a ra tÃ u trÆ°á»›c giá» boarding vÃ  mang theo giáº¥y tá» tÃ¹y thÃ¢n
              hÃ£y cÃ²n hiá»‡u lá»±c Ä‘á»ƒ Ä‘á»‘i chiáº¿u.
            </p>
          </aside>
        </div>
      </section>
    </main>

    <script>
      window.addEventListener("load", function () {
        window.setTimeout(function () {
          window.focus();
          window.print();
        }, 250);
      });

      window.addEventListener("afterprint", function () {
        window.close();
      });
    </script>
  </body>
</html>`;
}

export function xuatPdfTheLenMayBay(data: DuLieuXuatPdfTheLenMayBay) {
  if (typeof window === "undefined") {
    return false;
  }

  const cuaSoXemTruoc = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!cuaSoXemTruoc) {
    return false;
  }

  cuaSoXemTruoc.document.open();
  cuaSoXemTruoc.document.write(taoNoiDungPdfTheLenMayBay(data));
  cuaSoXemTruoc.document.close();
  cuaSoXemTruoc.focus();
  return true;
}
