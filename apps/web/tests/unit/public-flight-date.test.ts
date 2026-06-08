import { describe, expect, it } from "vitest";

import {
  addDaysToIsoDate,
  createDefaultFlightSearchCriteria,
  getVietnamTodayIso,
  resolveRoundTripReturnDate
} from "@/lib/public-flight-date";

describe("public-flight-date", () => {
  it("lay ngay hien tai theo mui gio Viet Nam", () => {
    expect(getVietnamTodayIso(new Date("2026-06-07T20:00:00.000Z"))).toBe("2026-06-08");
  });

  it("cong them so ngay vao chuoi iso", () => {
    expect(addDaysToIsoDate("2026-06-08", 3)).toBe("2026-06-11");
  });

  it("giu nguyen ngay ve neu van hop le", () => {
    expect(resolveRoundTripReturnDate("2026-06-08", "2026-06-12")).toBe("2026-06-12");
  });

  it("tu dong doi ngay ve khi ngay ve trong hoac nho hon ngay di", () => {
    expect(resolveRoundTripReturnDate("2026-06-08", "")).toBe("2026-06-11");
    expect(resolveRoundTripReturnDate("2026-06-08", "2026-06-07")).toBe("2026-06-11");
  });

  it("tao tieu chi mac dinh mot chieu tu ngay hien tai", () => {
    expect(createDefaultFlightSearchCriteria(new Date("2026-06-07T20:00:00.000Z"))).toEqual({
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
});
