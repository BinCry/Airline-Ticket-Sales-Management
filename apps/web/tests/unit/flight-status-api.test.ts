import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchFlightStatus,
  taoDuongDanTinhTrangChuyenBay
} from "@/lib/flight-status-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("flight-status-api", () => {
  it("tao duong dan tinh trang chuyen bay theo ma va ngay", () => {
    expect(
      taoDuongDanTinhTrangChuyenBay({
        code: "vn5201",
        date: "2026-05-23"
      })
    ).toBe("/flight-status?code=VN5201&date=2026-05-23");
  });

  it("goi api tinh trang chuyen bay voi query hop le", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          queryCode: "VN5201",
          queryDate: "2026-05-23",
          flights: [
            {
              flightId: 5201,
              code: "VN5201",
              from: "Thành phố Hồ Chí Minh",
              to: "Hà Nội",
              originCode: "SGN",
              destinationCode: "HAN",
              departureAt: "2026-05-23T06:10:00+07:00",
              arrivalAt: "2026-05-23T08:20:00+07:00",
              departureTime: "06:10",
              arrivalTime: "08:20",
              status: "on_time",
              statusLabel: "Đúng giờ",
              gate: "G2",
              note: "Lịch bay đang được khai thác theo kế hoạch."
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(fetchFlightStatus({ code: "vn5201", date: "2026-05-23" })).resolves.toMatchObject({
      queryCode: "VN5201",
      flights: [{ code: "VN5201" }]
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/flights/status?code=VN5201&date=2026-05-23",
      expect.objectContaining({
        cache: "no-store"
      })
    );
  });
});
