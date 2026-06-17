import type { ApiBoardingPass } from "@qlvmb/shared-types";

interface BoardingPassPdfPayload {
  bookingCode: string;
  boardingPass: ApiBoardingPass;
  segmentLabel?: string | null;
  boardingTimeLabel: string;
}

interface KichThuocPdf {
  width: number;
  height: number;
}

const KICH_THUOC_ANH = {
  width: 1200,
  height: 720
} as const;

const KICH_THUOC_TRANG_PDF: KichThuocPdf = {
  width: 1200,
  height: 720
};

function boKyTuKhongAnToan(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function boKyTuTenTep(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function ghepMangBytes(parts: Uint8Array[]) {
  const tongDoDai = parts.reduce((total, part) => total + part.length, 0);
  const ketQua = new Uint8Array(tongDoDai);
  let viTri = 0;

  parts.forEach((part) => {
    ketQua.set(part, viTri);
    viTri += part.length;
  });

  return ketQua;
}

function taoCotMaVach(chieuRongToiDa: number, chieuCaoToiDa: number) {
  const mauCot = Array.from({ length: 42 }, (_, index) => ({
    chieuRong: index % 3 === 0 ? 8 : index % 2 === 0 ? 5 : 3,
    chieuCao: 86 + (index % 5) * 10,
    mau: index % 4 === 0 ? "#123d69" : "#234f85"
  }));
  const tongChieuRongGoc = mauCot.reduce((tong, cot) => tong + cot.chieuRong, 0) + (mauCot.length - 1) * 5;
  const chieuCaoLonNhat = Math.max(...mauCot.map((cot) => cot.chieuCao));
  const tiLeRong = chieuRongToiDa / tongChieuRongGoc;
  const tiLeCao = chieuCaoToiDa / chieuCaoLonNhat;
  let viTriX = 0;

  return mauCot.map((cot) => {
    const x = Number((viTriX * tiLeRong).toFixed(2));
    const chieuRong = Number(Math.max(1.2, cot.chieuRong * tiLeRong).toFixed(2));
    const chieuCao = Number((cot.chieuCao * tiLeCao).toFixed(2));
    const y = Number((chieuCaoToiDa - chieuCao).toFixed(2));
    const boTron = Number(Math.max(0.8, chieuRong / 3).toFixed(2));
    viTriX += cot.chieuRong + 5;
    return `<rect x="${x}" y="${y}" width="${chieuRong}" height="${chieuCao}" rx="${boTron}" fill="${cot.mau}" />`;
  }).join("");
}

function taiAnhTuSvg(svgMarkup: string): Promise<HTMLImageElement> {
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(svgUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("Không thể dựng ảnh thẻ lên máy bay để xuất PDF."));
    };
    image.src = svgUrl;
  });
}

function taoBytesTuBase64(base64Value: string) {
  const binaryString = atob(base64Value);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

export function taoTenTepBoardingPass(payload: BoardingPassPdfPayload) {
  const bookingCode = boKyTuTenTep(payload.bookingCode.trim().toUpperCase() || "pnr");
  const ticketNumber = boKyTuTenTep(payload.boardingPass.ticketNumber.trim() || "ticket");
  return `the-len-may-bay-${bookingCode}-${ticketNumber}.pdf`;
}

export function taoSvgBoardingPass(payload: BoardingPassPdfPayload) {
  const thongTinMaBoarding = {
    x: 808,
    yGiaTri: 378,
    yNhan: 340
  } as const;
  const oGhe = {
    height: 100,
    width: 210,
    x: 88,
    y: 520
  } as const;
  const oCuaRaTau = {
    height: 100,
    width: 230,
    x: 324,
    y: 520
  } as const;
  const oGioBoarding = {
    height: 100,
    width: 240,
    x: 580,
    y: 520
  } as const;
  const oMaVach = {
    height: 100,
    width: 226,
    x: 846,
    y: 520
  } as const;
  const nenMaVach = {
    height: 64,
    width: 194,
    x: 16,
    y: 18
  } as const;
  const kichThuocMaVach = {
    height: 44,
    width: 158
  } as const;
  const bookingCode = boKyTuKhongAnToan(payload.bookingCode.trim().toUpperCase());
  const passengerName = boKyTuKhongAnToan(payload.boardingPass.passengerName);
  const ticketNumber = boKyTuKhongAnToan(payload.boardingPass.ticketNumber);
  const seatNumber = boKyTuKhongAnToan(payload.boardingPass.seatNumber);
  const gate = boKyTuKhongAnToan(payload.boardingPass.gate);
  const barcode = boKyTuKhongAnToan(payload.boardingPass.barcode);
  const boardingTimeLabel = boKyTuKhongAnToan(payload.boardingTimeLabel);
  const segmentLabel = boKyTuKhongAnToan(payload.segmentLabel?.trim() || "Chặng bay chưa xác định");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${KICH_THUOC_ANH.width}" height="${KICH_THUOC_ANH.height}" viewBox="0 0 ${KICH_THUOC_ANH.width} ${KICH_THUOC_ANH.height}" role="img" aria-label="Thẻ lên máy bay">
  <defs>
    <linearGradient id="nenThe" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#edf4fb" />
    </linearGradient>
    <linearGradient id="nenDau" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#123d69" />
      <stop offset="100%" stop-color="#1f5b98" />
    </linearGradient>
  </defs>

  <rect width="1200" height="720" rx="40" fill="#eef4f9" />
  <rect x="40" y="40" width="1120" height="640" rx="32" fill="url(#nenThe)" />
  <rect x="40" y="40" width="1120" height="148" rx="32" fill="url(#nenDau)" />
  <rect x="40" y="156" width="1120" height="524" rx="0" fill="url(#nenThe)" />
  <circle cx="1110" cy="112" r="18" fill="#d2a94f" opacity="0.55" />
  <circle cx="1064" cy="112" r="18" fill="#d2a94f" opacity="0.3" />

  <text x="88" y="96" fill="#d9b464" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="4">BOARDING PASS</text>
  <text x="88" y="145" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="800">Thẻ lên máy bay</text>

  <text x="88" y="236" fill="#8c6b22" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="3">MÃ ĐẶT CHỖ</text>
  <text x="88" y="274" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">${bookingCode}</text>

  <text x="390" y="236" fill="#8c6b22" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="3">HÀNH KHÁCH</text>
  <text x="390" y="274" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">${passengerName}</text>

  <text x="88" y="334" fill="#52647c" font-family="Segoe UI, Arial, sans-serif" font-size="22">Số vé</text>
  <text x="88" y="372" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700">${ticketNumber}</text>

  <text x="88" y="430" fill="#52647c" font-family="Segoe UI, Arial, sans-serif" font-size="22">Chặng bay</text>
  <text x="88" y="468" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">${segmentLabel}</text>

  <text x="${thongTinMaBoarding.x}" y="${thongTinMaBoarding.yNhan}" fill="#52647c" font-family="Segoe UI, Arial, sans-serif" font-size="20">Mã boarding</text>
  <text x="${thongTinMaBoarding.x}" y="${thongTinMaBoarding.yGiaTri}" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" textLength="264" lengthAdjust="spacingAndGlyphs">${barcode}</text>

  <rect x="${oGhe.x}" y="${oGhe.y}" width="${oGhe.width}" height="${oGhe.height}" rx="24" fill="#f5f8fc" />
  <rect x="${oCuaRaTau.x}" y="${oCuaRaTau.y}" width="${oCuaRaTau.width}" height="${oCuaRaTau.height}" rx="24" fill="#f5f8fc" />
  <rect x="${oGioBoarding.x}" y="${oGioBoarding.y}" width="${oGioBoarding.width}" height="${oGioBoarding.height}" rx="24" fill="#f5f8fc" />
  <rect x="${oMaVach.x}" y="${oMaVach.y}" width="${oMaVach.width}" height="${oMaVach.height}" rx="24" fill="#f5f8fc" />
  <rect x="${oMaVach.x + nenMaVach.x}" y="${oMaVach.y + nenMaVach.y}" width="${nenMaVach.width}" height="${nenMaVach.height}" rx="18" fill="#edf3f8" />

  <text x="120" y="560" fill="#52647c" font-family="Segoe UI, Arial, sans-serif" font-size="22">Ghế</text>
  <text x="120" y="602" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">${seatNumber}</text>

  <text x="366" y="560" fill="#52647c" font-family="Segoe UI, Arial, sans-serif" font-size="22">Cửa ra tàu</text>
  <text x="366" y="602" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800">${gate}</text>

  <text x="612" y="560" fill="#52647c" font-family="Segoe UI, Arial, sans-serif" font-size="22">Giờ boarding</text>
  <text x="612" y="602" fill="#123d69" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800">${boardingTimeLabel}</text>

  <g transform="translate(${oMaVach.x + 34}, ${oMaVach.y + 28})">
    ${taoCotMaVach(kichThuocMaVach.width, kichThuocMaVach.height)}
  </g>
</svg>`.trim();
}

export function taoPdfTuJpeg(jpegBytes: Uint8Array, pageSize: KichThuocPdf) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [
    new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])
  ];
  const objectOffsets: number[] = [];
  let currentOffset = parts[0].length;

  function themObject(objectIndex: number, objectParts: Uint8Array[]) {
    objectOffsets[objectIndex] = currentOffset;
    const objectBytes = ghepMangBytes([
      encoder.encode(`${objectIndex} 0 obj\n`),
      ...objectParts,
      encoder.encode("\nendobj\n")
    ]);
    parts.push(objectBytes);
    currentOffset += objectBytes.length;
  }

  themObject(1, [encoder.encode("<< /Type /Catalog /Pages 2 0 R >>")]);
  themObject(2, [encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")]);
  themObject(3, [
    encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageSize.width} ${pageSize.height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    )
  ]);
  themObject(4, [
    encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${pageSize.width} /Height ${pageSize.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    ),
    jpegBytes,
    encoder.encode("\nendstream")
  ]);

  const contentStream = `q
${pageSize.width} 0 0 ${pageSize.height} 0 0 cm
/Im0 Do
Q`;

  themObject(5, [
    encoder.encode(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`)
  ]);

  const xrefOffset = currentOffset;
  const xrefEntries = ["0000000000 65535 f "];

  for (let objectIndex = 1; objectIndex <= 5; objectIndex += 1) {
    xrefEntries.push(`${String(objectOffsets[objectIndex] ?? 0).padStart(10, "0")} 00000 n `);
  }

  parts.push(
    encoder.encode(
      `xref\n0 6\n${xrefEntries.join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    )
  );

  return ghepMangBytes(parts);
}

export async function xuatBoardingPassPdf(payload: BoardingPassPdfPayload) {
  const svgMarkup = taoSvgBoardingPass(payload);
  const image = await taiAnhTuSvg(svgMarkup);
  const canvas = document.createElement("canvas");
  canvas.width = KICH_THUOC_ANH.width;
  canvas.height = KICH_THUOC_ANH.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Trình duyệt không hỗ trợ xuất PDF lúc này.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const jpegBase64 = canvas.toDataURL("image/jpeg", 0.98).split(",")[1];
  if (!jpegBase64) {
    throw new Error("Không thể tạo dữ liệu PDF cho thẻ lên máy bay.");
  }

  const pdfBytes = taoPdfTuJpeg(taoBytesTuBase64(jpegBase64), KICH_THUOC_TRANG_PDF);
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = pdfUrl;
  downloadLink.download = taoTenTepBoardingPass(payload);
  downloadLink.rel = "noopener";
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1500);
}
