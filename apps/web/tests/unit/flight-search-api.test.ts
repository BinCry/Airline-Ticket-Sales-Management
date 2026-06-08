import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FlightSearchApiError,
  chuanHoaTieuChiTimChuyenBay,
  fetchFlightSearch,
  taoDuongDanTimChuyenBay,
  taoTieuChiTimChuyenBayMacDinh
} from "@/lib/flight-search-api";

const originalFetch = global.fetch;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-08T03:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("flight-search-api", () => {
  it("tao tieu chi mac dinh theo gio Viet Nam va mac dinh mot chieu", () => {
    expect(taoTieuChiTimChuyenBayMacDinh()).toEqual({
      from: "SGN",
      to: "HAN",
      departureDate: "2026-06-08",
      returnDate: null,
      tripType: "one_way",
      adultCount: 1,
      childCount: 0,
      infantCount: 0
    });
  });

  it("dung tieu chi mac dinh dong khi mo trang search khong co query", () => {
    expect(chuanHoaTieuChiTimChuyenBay({})).toEqual({
      from: "SGN",
      to: "HAN",
      departureDate: "2026-06-08",
      returnDate: null,
      tripType: "one_way",
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
        departureDate: "2026-07-20",
        returnDate: "2026-07-23",
        tripType: "one_way",
        adultCount: "2",
        childCount: "1",
        infantCount: "0"
      })
    ).toEqual({
      from: "SGN",
      to: "DAD",
      departureDate: "2026-07-20",
      returnDate: null,
      tripType: "one_way",
      adultCount: 2,
      childCount: 1,
      infantCount: 0
    });
  });

  it("tu dong bu ngay ve sau ba ngay khi query khu hoi chua co ngay ve", () => {
    expect(
      chuanHoaTieuChiTimChuyenBay({
        from: "sgn",
        to: "han",
        departureDate: "2026-07-20",
        tripType: "round_trip"
      })
    ).toEqual({
      from: "SGN",
      to: "HAN",
      departureDate: "2026-07-20",
      returnDate: "2026-07-23",
      tripType: "round_trip",
      adultCount: 1,
      childCount: 0,
      infantCount: 0
    });
  });

  it("tao duong dan tim chuyen bay cho khu hoi", () => {
    expect(
      taoDuongDanTimChuyenBay({
        from: "SGN",
        to: "HAN",
        departureDate: "2026-07-20",
        returnDate: "2026-07-23",
        tripType: "round_trip",
        adultCount: 1,
        childCount: 0,
        infantCount: 0
      })
    ).toBe(
      "/search?from=SGN&to=HAN&departureDate=2026-07-20&tripType=round_trip&adultCount=1&childCount=0&infantCount=0&returnDate=2026-07-23"
    );
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
            departureDate: "2026-07-20",
            returnDate: null,
            tripType: "one_way",
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
        departureDate: "2026-07-20",
        returnDate: null,
        tripType: "one_way",
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
      "http://localhost:8080/api/flights/search?from=SGN&to=HAN&departureDate=2026-07-20&tripType=one_way&adultCount=1&childCount=0&infantCount=0",
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
        departureDate: "2026-07-20",
        returnDate: null,
        tripType: "one_way",
        adultCount: 1,
        childCount: 0,
        infantCount: 0
      })
    ).rejects.toMatchObject({
      name: "FlightSearchApiError",
      status: 400,
      message: "Ma san bay di khong hop le."
    } satisfies Partial<FlightSearchApiError>);
  });
});
