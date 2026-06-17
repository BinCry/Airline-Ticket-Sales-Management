import { describe, expect, it } from "vitest";

import { taoPdfTuJpeg, taoSvgBoardingPass, taoTenTepBoardingPass } from "@/lib/boarding-pass-pdf";

describe("boarding-pass-pdf", () => {
  it("tao ten tep pdf on dinh cho thẻ lên máy bay", () => {
    expect(
      taoTenTepBoardingPass({
        bookingCode: "A6C2P1",
        boardingPass: {
          ticketNumber: "7380000000001",
          passengerName: "Nguyen Van A",
          seatNumber: "12A",
          gate: "G3",
          boardingTime: "2026-03-20T05:25:00+07:00",
          barcode: "BP-A6C2P1-7380000000001"
        },
        boardingTimeLabel: "05:25 20 thg 3, 2026",
        segmentLabel: "QC010618 • Thành phố Hồ Chí Minh - Hà Nội • 06:00 18 thg 6, 2026"
      })
    ).toBe("the-len-may-bay-A6C2P1-7380000000001.pdf");
  });

  it("chen du lieu vao svg ma khong lam vo markup", () => {
    const svgMarkup = taoSvgBoardingPass({
      bookingCode: "A6C2P1",
      boardingPass: {
        ticketNumber: "7380000000001",
        passengerName: "Nguyen & Van <A>",
        seatNumber: "9C",
        gate: "G1",
        boardingTime: "2026-03-20T05:25:00+07:00",
        barcode: "BP-A6C2P1-7380000000001"
      },
      boardingTimeLabel: "05:15 18 thg 6, 2026",
      segmentLabel: "QC010618 • Thành phố Hồ Chí Minh - Hà Nội • 06:00 18 thg 6, 2026"
    });

    expect(svgMarkup).toContain("Nguyen &amp; Van &lt;A&gt;");
    expect(svgMarkup).toContain("QC010618");
    expect(svgMarkup).toContain("BP-A6C2P1-7380000000001");
  });

  it("giu cac cot ma vach nam gon trong khung duoi dong chang bay", () => {
    const svgMarkup = taoSvgBoardingPass({
      bookingCode: "MSLCY2",
      boardingPass: {
        ticketNumber: "7387960608662",
        passengerName: "truong",
        seatNumber: "9C",
        gate: "G1",
        boardingTime: "2026-06-18T05:15:00+07:00",
        barcode: "BP-MSLCY2-7387960608662"
      },
      boardingTimeLabel: "05:15 18 thg 6, 2026",
      segmentLabel: "QC010618 • Thành phố Hồ Chí Minh - Hà Nội • 06:00 18 thg 6, 2026"
    });
    const danhSachCot = Array.from(
      svgMarkup.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="[\d.]+" fill="#(?:123d69|234f85)" \/>/g)
    );
    const khungMaVach = svgMarkup.match(
      /<rect x="862" y="([\d.]+)" width="194" height="64" rx="18" fill="#edf3f8" \/>/
    );

    expect(danhSachCot.length).toBeGreaterThan(0);
    danhSachCot.forEach(([, x, y, width, height]) => {
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(y)).toBeGreaterThanOrEqual(0);
      expect(Number(x) + Number(width)).toBeLessThanOrEqual(158.1);
      expect(Number(y) + Number(height)).toBeLessThanOrEqual(44.1);
    });
    expect(khungMaVach).not.toBeNull();
    expect(Number(khungMaVach?.[1])).toBeGreaterThan(468);
    expect(svgMarkup).toContain('textLength="264"');
  });

  it("dong goi pdf voi object anh nhung khong doi du lieu boarding pass", () => {
    const pdfBytes = taoPdfTuJpeg(new Uint8Array([255, 216, 255, 217]), {
      width: 1200,
      height: 720
    });
    const pdfText = new TextDecoder().decode(pdfBytes);

    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("/Subtype /Image");
    expect(pdfText).toContain("%%EOF");
  });
});
