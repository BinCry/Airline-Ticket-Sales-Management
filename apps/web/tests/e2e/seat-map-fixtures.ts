import type { ApiFlightSeatMap } from "@qlvmb/shared-types";

export function seatMapFixture(flightId = 18, row = 9, columns = ["A", "B", "C", "D", "E", "F"]): ApiFlightSeatMap {
  return {
    flightId, aircraftId: flightId, aircraftRegistration: `VN-${flightId}`, aircraftTypeCode: `TYPE${flightId}`, aircraftTypeName: `Tàu ${flightId}`,
    layout: { columns, aislesAfter: [columns[Math.floor(columns.length / 2) - 1]],
      rows: [{ row, fareFamily: "pho_thong_tiet_kiem", seats: columns }], disabledSeats: [] },
    seats: columns.map((column) => ({ seatNumber: `${row}${column}`, fareFamily: "pho_thong_tiet_kiem", occupied: false, disabled: false }))
  };
}

export const aircraftTypeFixture = { id: 18, code: "TYPE18", name: "Tàu 18", totalRows: 9, seatLayout: seatMapFixture().layout };
export const aircraftFixture = { id: 18, aircraftTypeId: 18, registrationCode: "VN-18", status: "ACTIVE", aircraftTypeCode: "TYPE18", aircraftTypeName: "Tàu 18" };
