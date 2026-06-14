import { describe, expect, it } from "vitest";

import type { ApiFlightCard } from "@qlvmb/shared-types";

import {
  DEFAULT_FLIGHT_SEARCH_FILTER_STATE,
  layKhungGioTheoChuyenBay,
  locDanhSachChuyenBay,
  taoKhoangGiaDong
} from "@/lib/flight-search-filters";

function taoChuyenBay(
  overrides: Partial<ApiFlightCard> & Pick<ApiFlightCard, "flightId" | "baseFare">
): ApiFlightCard {
  return {
    flightId: overrides.flightId,
    code: overrides.code ?? `VN${overrides.flightId}`,
    from: overrides.from ?? "Thành phố Hồ Chí Minh",
    to: overrides.to ?? "Hà Nội",
    originCode: overrides.originCode ?? "SGN",
    destinationCode: overrides.destinationCode ?? "HAN",
    departureAt: overrides.departureAt ?? "2026-05-23T06:10:00+07:00",
    arrivalAt: overrides.arrivalAt ?? "2026-05-23T08:20:00+07:00",
    departureTime: overrides.departureTime ?? "06:10",
    arrivalTime: overrides.arrivalTime ?? "08:20",
    duration: overrides.duration ?? "2 giờ 10 phút",
    status: overrides.status ?? "on_time",
    baseFare: overrides.baseFare,
    fares: overrides.fares ?? [
      {
        fareFamily: "pho_thong_tiet_kiem",
        inventoryId: overrides.flightId * 100 + 1,
        price: overrides.baseFare,
        seatsLeft: overrides.seatsLeft ?? 12,
        title: "Phổ thông tiết kiệm",
        totalSeats: 120
      },
      {
        fareFamily: "pho_thong_linh_hoat",
        inventoryId: overrides.flightId * 100 + 2,
        price: overrides.baseFare + 500000,
        seatsLeft: overrides.seatsLeft ?? 12,
        title: "Phổ thông linh hoạt",
        totalSeats: 36
      },
      {
        fareFamily: "thuong_gia",
        inventoryId: overrides.flightId * 100 + 3,
        price: overrides.baseFare + 1000000,
        seatsLeft: overrides.seatsLeft ?? 12,
        title: "Thương gia",
        totalSeats: 12
      }
    ]
  };
}

describe("flight-search-filters", () => {
  it("xac dinh dung khung gio theo gio khoi hanh", () => {
    expect(
      layKhungGioTheoChuyenBay(
        taoChuyenBay({ flightId: 1, baseFare: 1000000, departureTime: "02:15" })
      )
    ).toBe("khuya");
    expect(
      layKhungGioTheoChuyenBay(
        taoChuyenBay({ flightId: 2, baseFare: 1000000, departureTime: "09:30" })
      )
    ).toBe("sang");
    expect(
      layKhungGioTheoChuyenBay(
        taoChuyenBay({ flightId: 3, baseFare: 1000000, departureTime: "14:05" })
      )
    ).toBe("chieu");
    expect(
      layKhungGioTheoChuyenBay(
        taoChuyenBay({ flightId: 4, baseFare: 1000000, departureTime: "20:40" })
      )
    ).toBe("toi");
  });

  it("tao cac khoang gia dong tu danh sach chuyen bay", () => {
    const options = taoKhoangGiaDong([
      taoChuyenBay({ flightId: 1, baseFare: 1490000 }),
      taoChuyenBay({ flightId: 2, baseFare: 1890000 }),
      taoChuyenBay({ flightId: 3, baseFare: 3490000 }),
      taoChuyenBay({ flightId: 4, baseFare: 3720000 })
    ]);

    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0]?.min).toBe(0);
  });

  it("loc danh sach theo khung gio, ngan sach va so ghe", () => {
    const flights = [
      taoChuyenBay({
        flightId: 1,
        code: "VN5201",
        departureTime: "06:10",
        baseFare: 1890000,
        seatsLeft: 16
      }),
      taoChuyenBay({
        flightId: 2,
        code: "VN5205",
        departureTime: "11:30",
        baseFare: 1590000,
        seatsLeft: 4
      }),
      taoChuyenBay({
        flightId: 3,
        code: "VN5211",
        departureTime: "18:45",
        baseFare: 3690000,
        seatsLeft: 6
      })
    ];
    const budgetOptions = taoKhoangGiaDong(flights);
    const budgetOptionChuaVN5201 =
      budgetOptions.find(
        (option) =>
          1890000 >= option.min && (option.max === null || 1890000 <= option.max)
      ) ?? null;

    const filtered = locDanhSachChuyenBay(
      flights,
      {
        ...DEFAULT_FLIGHT_SEARCH_FILTER_STATE,
        timeSlots: ["sang"],
        minimumSeats: 10,
        budgetId: budgetOptionChuaVN5201?.id ?? null
      },
      budgetOptions
    );

    expect(filtered.map((flight) => flight.code)).toEqual(["VN5201"]);
  });
});
