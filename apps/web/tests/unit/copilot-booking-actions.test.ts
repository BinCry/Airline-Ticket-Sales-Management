import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { ApiFlightBookingOptionsResponse } from "@qlvmb/shared-types";

import {
  applyCopilotPassengerInfo,
  buildSearchCriteriaFromCopilotInput
} from "@/lib/copilot-booking-actions";

function createSegmentOptions(): ApiFlightBookingOptionsResponse {
  return {
    arrivalAt: "2026-07-01T10:00:00+07:00",
    baseFare: 1200000,
    code: "VN123",
    departureAt: "2026-07-01T08:00:00+07:00",
    destinationCode: "HAN",
    fareOptions: [
      {
        fareFamily: "pho_thong_tiet_kiem",
        inventoryId: 101,
        price: 1200000,
        rowEnd: 20,
        rowStart: 8,
        seatsLeft: 8,
        title: "Pho thong tiet kiem",
        totalSeats: 48
      },
      {
        fareFamily: "thuong_gia",
        inventoryId: 102,
        price: 2200000,
        rowEnd: 4,
        rowStart: 1,
        seatsLeft: 4,
        title: "Thuong gia",
        totalSeats: 12
      }
    ],
    flightId: 1,
    from: "Thanh pho Ho Chi Minh",
    originCode: "SGN",
    seats: [
      { fareFamily: "thuong_gia", occupied: false, seatNumber: "1A" },
      { fareFamily: "thuong_gia", occupied: false, seatNumber: "1C" },
      { fareFamily: "pho_thong_tiet_kiem", occupied: false, seatNumber: "9A" },
      { fareFamily: "pho_thong_tiet_kiem", occupied: false, seatNumber: "9C" },
      { fareFamily: "pho_thong_tiet_kiem", occupied: true, seatNumber: "9F" }
    ],
    to: "Ha Noi"
  };
}

describe("copilot-booking-actions", () => {
  it("cap nhat tieu chi tim chuyen bay tu yeu cau cua agent", () => {
    const nextCriteria = buildSearchCriteriaFromCopilotInput(
      {
        adultCount: 1,
        childCount: 0,
        departureDate: "2026-07-01",
        from: "SGN",
        infantCount: 0,
        returnDate: null,
        to: "HAN",
        tripType: "one_way"
      },
      {
        adultCount: 2,
        departureDate: "2026-07-02",
        from: "dad",
        returnDate: "2026-07-08",
        to: "pqc",
        tripType: "round_trip"
      }
    );

    expect(nextCriteria).toEqual({
      adultCount: 2,
      childCount: 0,
      departureDate: "2026-07-02",
      from: "DAD",
      infantCount: 0,
      returnDate: "2026-07-08",
      to: "PQC",
      tripType: "round_trip"
    });
  });

  it("tu dien hanh khach va chon ghe trong phu hop theo so thich", () => {
    const result = applyCopilotPassengerInfo({
      bookingOptions: [createSegmentOptions()],
      contact: {
        email: "",
        fullName: "",
        phone: ""
      },
      input: {
        autoChooseSeats: true,
        contactEmail: "hanhkhach@example.com",
        contactFullName: "Nguyen Van A",
        contactPhone: "0912345678",
        passengers: [
          {
            dateOfBirth: "1995-05-12",
            documentNumber: "079123456789",
            documentType: "CCCD",
            fullName: "Nguyen Van A",
            passengerIndex: 0,
            preferredFareFamily: "pho_thong_tiet_kiem",
            seatPreference: "gan cua so"
          }
        ]
      },
      passengers: [
        {
          dateOfBirth: "",
          documentNumber: "",
          documentType: "CCCD",
          fullName: "",
          passengerType: "adult"
        }
      ],
      segmentChoices: [
        [
          {
            fareFamily: null,
            farePrice: 0,
            fareTitle: "",
            inventoryId: null,
            seatNumber: ""
          }
        ]
      ]
    });

    expect(result.nextContact).toEqual({
      email: "hanhkhach@example.com",
      fullName: "Nguyen Van A",
      phone: "0912345678"
    });
    expect(result.nextPassengers[0]).toMatchObject({
      dateOfBirth: "1995-05-12",
      documentNumber: "079123456789",
      documentType: "CCCD",
      fullName: "Nguyen Van A"
    });
    expect(result.nextSegmentChoices[0][0]).toMatchObject({
      fareFamily: "pho_thong_tiet_kiem",
      inventoryId: 101,
      seatNumber: "9A"
    });
    expect(result.assignedSeats[0]).toMatchObject({
      passengerIndex: 0,
      seatNumber: "9A",
      segmentIndex: 0
    });
  });

  it("co ba action duoc gan vao dung man hinh", () => {
    const searchSource = readFileSync(
      new URL("../../src/components/search-results-page-client.tsx", import.meta.url),
      "utf8"
    );
    const bookingSource = readFileSync(
      new URL("../../src/components/booking-page-client.tsx", import.meta.url),
      "utf8"
    );
    const checkoutSource = readFileSync(
      new URL("../../src/app/booking/[pnr]/checkout/page.tsx", import.meta.url),
      "utf8"
    );

    expect(searchSource).toContain('name: "searchFlights"');
    expect(bookingSource).toContain('name: "fillPassengerInfo"');
    expect(checkoutSource).toContain('name: "generatePayment"');
  });
});
