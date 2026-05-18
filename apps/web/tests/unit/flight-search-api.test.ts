import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FlightSearchApiError,
  chuanHoaTieuChiTimChuyenBay,
  fetchFlightSearch,
  laGoiGiaHopLe,
  taoDuongDanTimChuyenBay
} from "@/lib/flight-search-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("flight-search-api", () => {
  it("dung tieu chi mac dinh local khi mo trang search khong co query", () => {
    expect(chuanHoaTieuChiTimChuyenBay({})).toEqual({
      from: "SGN",
      to: "HAN",
      departureDate: "2026-05-23",
      returnDate: "2026-05-26",
      tripType: "round_trip",
      fareFamily: null,
      adultCount: 1,
      childCount: 0,
      infantCount: 0
    });
  });

  it("chuan hoa query tim chuyen bay cho mot chieu", () => {
    expect(
      chuanHoaTieuChiTimChuyenBay({
        from: "sgn",
        to: "dad",
        departureDate: "2026-04-20",
        returnDate: "2026-04-23",
        tripType: "one_way",
        fareFamily: "thuong_gia",
        adultCount: "2",
        childCount: "1",
        infantCount: "0"
      })
    ).toEqual({
      from: "SGN",
      to: "DAD",
      departureDate: "2026-04-20",
      returnDate: null,
        tripType: "one_way",
        fareFamily: "thuong_gia",
        adultCount: 2,
        childCount: 1,
        infantCount: 0
    });
  });

  it("tao duong dan tim chuyen bay cho khu hoi", () => {
    expect(
      taoDuongDanTimChuyenBay({
        from: "SGN",
        to: "HAN",
        departureDate: "2026-05-23",
        returnDate: "2026-05-26",
        tripType: "round_trip",
        fareFamily: "pho_thong_linh_hoat",
        adultCount: 1,
        childCount: 0,
        infantCount: 0
      })
    ).toBe(
      "/search?from=SGN&to=HAN&departureDate=2026-05-23&tripType=round_trip&adultCount=1&childCount=0&infantCount=0&returnDate=2026-05-26&fareFamily=pho_thong_linh_hoat"
    );
  });

  it("xac thuc goi gia hop le", () => {
    expect(laGoiGiaHopLe("thuong_gia")).toBe(true);
    expect(laGoiGiaHopLe("goi_khong_ton_tai")).toBe(false);
  });

  it("goi backend tim chuyen bay voi query hop le", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tripType: "one_way",
          from: "SGN",
          to: "HAN",
          filters: ["Gio bay"],
          flights: [],
          fares: [],
          criteria: {
            from: "SGN",
            to: "HAN",
            departureDate: "2026-05-23",
            returnDate: null,
            tripType: "one_way",
            fareFamily: null,
            adultCount: 1,
            childCount: 0,
            infantCount: 0
          },
          outboundFlights: [],
          returnFlights: []
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

    await expect(
      fetchFlightSearch({
        from: "SGN",
        to: "HAN",
        departureDate: "2026-05-23",
        returnDate: null,
        tripType: "one_way",
        fareFamily: null,
        adultCount: 1,
        childCount: 0,
        infantCount: 0
      })
    ).resolves.toMatchObject({
      tripType: "one_way",
      from: "SGN",
      to: "HAN"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/flights/search?from=SGN&to=HAN&departureDate=2026-05-23&tripType=one_way&adultCount=1&childCount=0&infantCount=0",
      expect.objectContaining({
        cache: "no-store"
      })
    );
  });

  it("bao loi ro rang khi backend search tra ve loi", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Ma san bay di khong hop le." }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      })
    ) as typeof fetch;

    await expect(
      fetchFlightSearch({
        from: "XXX",
        to: "HAN",
        departureDate: "2026-05-23",
        returnDate: null,
        tripType: "one_way",
        fareFamily: null,
        adultCount: 1,
        childCount: 0,
        infantCount: 0
      })
    ).rejects.toMatchObject({
      name: "FlightSearchApiError",
      status: 400,
      message: "Ma san bay di khong hop le."
    });
  });
});
