import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiFlightSeatMap } from "@qlvmb/shared-types";
import { SeatMap } from "@/components/seat-map";
import { fetchFlightSeatMap, isAircraftSeatLayout, saveAircraftType } from "@/lib/seat-map-api";

const map: ApiFlightSeatMap = {
  flightId: 1, aircraftId: 2, aircraftRegistration: "VN-TEST", aircraftTypeCode: "TEST", aircraftTypeName: "Tàu thử",
  layout: { columns: ["A", "B", "C"], aislesAfter: ["B"], rows: [
    { row: 4, fareFamily: "thuong_gia", seats: ["A", "C"] },
    { row: 12, fareFamily: "pho_thong_tiet_kiem", seats: ["A", "B", "C"] }
  ], disabledSeats: ["12C"] },
  seats: [
    { seatNumber: "4A", fareFamily: "thuong_gia", occupied: false, disabled: false },
    { seatNumber: "4C", fareFamily: "thuong_gia", occupied: false, disabled: false },
    { seatNumber: "12A", fareFamily: "pho_thong_tiet_kiem", occupied: true, disabled: false },
    { seatNumber: "12B", fareFamily: "pho_thong_tiet_kiem", occupied: false, disabled: false },
    { seatNumber: "12C", fareFamily: "pho_thong_tiet_kiem", occupied: false, disabled: true }
  ]
};
afterEach(() => vi.unstubAllGlobals());

describe("SeatMap dùng layout API", () => {
  it("render đúng ghế, khoảng trống và lối đi, không dựng 168 ghế", () => {
    const html = renderToStaticMarkup(createElement(SeatMap, { map, label: "Sơ đồ", fareFamily: "pho_thong_tiet_kiem", selectedSeat: "12B", onSelect: () => {} }));
    expect(html.match(/<button/g)).toHaveLength(5);
    expect(html.match(/class="seat-map-aisle"/g)).toHaveLength(2);
    expect(html).toContain('class="seat-map-empty"');
    expect(html).toContain("Ghế 4A, Thương gia, Khác hạng vé");
    expect(html).toContain("Ghế 12A, Phổ thông tiết kiệm, Đã có người giữ");
    expect(html).toContain("Ghế 12C, Phổ thông tiết kiệm, Vô hiệu hóa");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('class="seat-legend-dot seat-legend-priority"');
    expect(html).toContain('class="seat-legend-dot seat-legend-selected"');
    expect(html).toContain('class="seat-legend-dot seat-legend-unavailable"');
    expect(html).toContain("Vùng ghế của hạng đã chọn");
    expect(html).toContain("Ghế đang chọn");
    expect(html).toContain("Ghế không chọn được");
    expect(html).not.toContain("Dùng Tab");
  });
  it("chỉ ghế hiện tại của hành khách được mở lại, ghế hành khách khác vẫn khóa", () => {
    const html = renderToStaticMarkup(createElement(SeatMap, { map, label: "Sơ đồ", fareFamily: "pho_thong_tiet_kiem", selectedSeat: "12A", currentSeat: "12A", unavailableSeats: new Set(["12B"]), onSelect: () => {} }));
    const ownSeat = html.match(/<button[^>]*aria-label="Ghế 12A[^>]*>/)?.[0];
    expect(ownSeat).not.toContain("disabled");
    expect(html).toContain("Đã chọn cho hành khách khác");
  });
  it("từ chối JSON sai cấu trúc/hạng vé", () => {
    expect(isAircraftSeatLayout(map.layout)).toBe(true);
    expect(isAircraftSeatLayout({ ...map.layout, rows: [{ row: 1, fareFamily: "invalid", seats: ["A"] }] })).toBe(false);
    expect(isAircraftSeatLayout({ ...map.layout, aislesAfter: null })).toBe(false);
  });
  it("đọc endpoint cabin riêng và giữ lỗi cấu hình/409", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(map), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Chuyến bay chưa gán tàu bay" }), { status: 409, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchFlightSeatMap(1)).resolves.toEqual(map);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8080/api/flights/1/seat-map");
    await expect(fetchFlightSeatMap(1)).rejects.toMatchObject({ status: 409, message: "Chuyến bay chưa gán tàu bay" });
  });
  it("gửi layout đầy đủ khi cập nhật, không nuốt xung đột ghế", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Ghế 12A đang giữ" }), { status: 409, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveAircraftType({ code: "TEST", name: "Tàu thử", totalRows: 12, seatLayout: map.layout }, "token", 2)).rejects.toMatchObject({ status: 409 });
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).seatLayout).toEqual(map.layout);
  });
});
