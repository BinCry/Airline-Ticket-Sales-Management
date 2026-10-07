import { FARE_FAMILIES, type AircraftSeatLayout, type ApiFlightSeatMap } from "@qlvmb/shared-types";
import { ApiClientError, requestApi } from "@/lib/api-client";

export interface AircraftTypeInput {
  code: string;
  name: string;
  totalRows: number;
  seatLayout: AircraftSeatLayout;
}
export interface AircraftTypeItem extends AircraftTypeInput { id: number }
export type AircraftStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export interface AircraftInput {
  aircraftTypeId: number;
  registrationCode: string;
  status: AircraftStatus;
}
export interface AircraftItem extends AircraftInput {
  id: number;
  aircraftTypeCode: string;
  aircraftTypeName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isFare(value: unknown) {
  return FARE_FAMILIES.some((fare) => fare === value);
}
export function isAircraftSeatLayout(value: unknown): value is AircraftSeatLayout {
  return isRecord(value) && isStrings(value.columns) && value.columns.length > 0
    && isStrings(value.aislesAfter) && isStrings(value.disabledSeats)
    && Array.isArray(value.rows) && value.rows.length > 0
    && value.rows.every((row) => isRecord(row) && Number.isInteger(row.row) && Number(row.row) > 0
      && isFare(row.fareFamily) && isStrings(row.seats));
}
function isSeatMap(value: unknown): value is ApiFlightSeatMap {
  return isRecord(value) && typeof value.flightId === "number" && typeof value.aircraftId === "number"
    && typeof value.aircraftRegistration === "string" && typeof value.aircraftTypeCode === "string"
    && typeof value.aircraftTypeName === "string" && isAircraftSeatLayout(value.layout)
    && Array.isArray(value.seats) && value.seats.every((seat) => isRecord(seat)
      && typeof seat.seatNumber === "string" && isFare(seat.fareFamily)
      && typeof seat.occupied === "boolean" && typeof seat.disabled === "boolean");
}
function isAircraftType(value: unknown): value is AircraftTypeItem {
  return isRecord(value) && typeof value.id === "number" && typeof value.code === "string"
    && typeof value.name === "string" && Number.isInteger(value.totalRows) && isAircraftSeatLayout(value.seatLayout);
}
function isAircraft(value: unknown): value is AircraftItem {
  return isRecord(value) && typeof value.id === "number" && typeof value.aircraftTypeId === "number"
    && typeof value.registrationCode === "string" && ["ACTIVE", "MAINTENANCE", "INACTIVE"].includes(String(value.status))
    && typeof value.aircraftTypeCode === "string" && typeof value.aircraftTypeName === "string";
}

export async function fetchFlightSeatMap(flightId: number): Promise<ApiFlightSeatMap> {
  const response = await requestApi<unknown>(`/api/flights/${flightId}/seat-map`, {
    fallbackMessage: "Không thể tải sơ đồ ghế. Vui lòng kiểm tra cấu hình tàu bay."
  });
  if (!isSeatMap(response)) throw new ApiClientError("Dữ liệu sơ đồ ghế không hợp lệ.", 500);
  return response;
}
export async function fetchAircraftTypes(accessToken: string): Promise<AircraftTypeItem[]> {
  const response = await requestApi<unknown>("/api/backoffice/operations/aircraft-types", { accessToken });
  if (!Array.isArray(response) || !response.every(isAircraftType)) throw new ApiClientError("Dữ liệu loại tàu không hợp lệ.", 500);
  return response;
}
export async function fetchAircraft(accessToken: string): Promise<AircraftItem[]> {
  const response = await requestApi<unknown>("/api/backoffice/operations/aircraft", { accessToken });
  if (!Array.isArray(response) || !response.every(isAircraft)) throw new ApiClientError("Dữ liệu tàu bay không hợp lệ.", 500);
  return response;
}
export async function saveAircraftType(input: AircraftTypeInput, accessToken: string, id?: number): Promise<AircraftTypeItem> {
  const response = await requestApi<unknown>(`/api/backoffice/operations/aircraft-types${id === undefined ? "" : `/${id}`}`, {
    accessToken, method: id === undefined ? "POST" : "PATCH", json: input
  });
  if (!isAircraftType(response)) throw new ApiClientError("Dữ liệu loại tàu không hợp lệ.", 500);
  return response;
}
export async function saveAircraft(input: AircraftInput, accessToken: string, id?: number): Promise<AircraftItem> {
  const response = await requestApi<unknown>(`/api/backoffice/operations/aircraft${id === undefined ? "" : `/${id}`}`, {
    accessToken, method: id === undefined ? "POST" : "PATCH", json: input
  });
  if (!isAircraft(response)) throw new ApiClientError("Dữ liệu tàu bay không hợp lệ.", 500);
  return response;
}
