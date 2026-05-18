import {
  FARE_FAMILIES,
  type ApiFareCard,
  type ApiFlightCard,
  type ApiFlightSearchCriteria,
  type ApiFlightSearchResponse,
  type FareFamily
} from "@qlvmb/shared-types";

import { ApiClientError, requestApi } from "@/lib/api-client";

type RawSearchParam = string | string[] | undefined;

export const TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH: ApiFlightSearchCriteria = {
  from: "SGN",
  to: "HAN",
  departureDate: "2026-05-23",
  returnDate: "2026-05-26",
  tripType: "round_trip",
  fareFamily: "pho_thong_linh_hoat",
  adultCount: 1,
  childCount: 0,
  infantCount: 0
};

export class FlightSearchApiError extends ApiClientError {
  constructor(
    message: string,
    status: number,
    errors: Record<string, string> = {},
    timestamp: string | null = null
  ) {
    super(message, status, errors, timestamp);
    this.name = "FlightSearchApiError";
  }
}

function toFlightSearchApiError(error: unknown): never {
  if (error instanceof ApiClientError) {
    throw new FlightSearchApiError(error.message, error.status, error.errors, error.timestamp);
  }

  throw error;
}

function layGiaTriDauTien(giaTri: RawSearchParam): string | undefined {
  if (Array.isArray(giaTri)) {
    return giaTri[0];
  }

  return giaTri;
}

function chuanHoaMaSanBay(giaTri: RawSearchParam, macDinh: string): string {
  const maSanBay = layGiaTriDauTien(giaTri)?.trim().toUpperCase();

  if (!maSanBay) {
    return macDinh;
  }

  return maSanBay;
}

function chuanHoaNgay(giaTri: RawSearchParam, macDinh: string): string {
  const ngay = layGiaTriDauTien(giaTri)?.trim();

  if (!ngay) {
    return macDinh;
  }

  return ngay;
}

function chuanHoaSoLuong(giaTri: RawSearchParam, macDinh: number, soToiThieu: number): number {
  const giaTriTho = layGiaTriDauTien(giaTri);
  const soLuong = Number.parseInt(giaTriTho ?? "", 10);

  if (!Number.isFinite(soLuong) || soLuong < soToiThieu) {
    return macDinh;
  }

  return soLuong;
}

function chuanHoaLoaiHanhTrinh(giaTri: RawSearchParam): ApiFlightSearchCriteria["tripType"] {
  return layGiaTriDauTien(giaTri) === "one_way" ? "one_way" : "round_trip";
}

export function laGoiGiaHopLe(giaTri: string): giaTri is FareFamily {
  return FARE_FAMILIES.includes(giaTri as FareFamily);
}

function chuanHoaGoiGia(giaTri: RawSearchParam): FareFamily | null {
  const goiGia = layGiaTriDauTien(giaTri);

  if (!goiGia || !laGoiGiaHopLe(goiGia)) {
    return null;
  }

  return goiGia;
}

function laMangChuyenBayHopLe(giaTri: unknown): giaTri is ApiFlightCard[] {
  return Array.isArray(giaTri);
}

function laMangGoiGiaHopLe(giaTri: unknown): giaTri is ApiFareCard[] {
  return Array.isArray(giaTri);
}

export function chuanHoaTieuChiTimChuyenBay(
  searchParams: Record<string, RawSearchParam>
): ApiFlightSearchCriteria {
  const tripType = chuanHoaLoaiHanhTrinh(searchParams.tripType);
  const departureDate = chuanHoaNgay(
    searchParams.departureDate,
    TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.departureDate
  );
  const returnDate = tripType === "one_way"
    ? null
    : chuanHoaNgay(
        searchParams.returnDate,
        TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.returnDate ?? TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.departureDate
      );

  return {
    from: chuanHoaMaSanBay(searchParams.from, TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.from),
    to: chuanHoaMaSanBay(searchParams.to, TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.to),
    departureDate,
    returnDate,
    tripType,
    fareFamily: chuanHoaGoiGia(searchParams.fareFamily),
    adultCount: chuanHoaSoLuong(
      searchParams.adultCount,
      TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.adultCount,
      1
    ),
    childCount: chuanHoaSoLuong(
      searchParams.childCount,
      TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.childCount,
      0
    ),
    infantCount: chuanHoaSoLuong(
      searchParams.infantCount,
      TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.infantCount,
      0
    )
  };
}

export function taoDuongDanTimChuyenBay(criteria: ApiFlightSearchCriteria): string {
  const params = new URLSearchParams({
    from: criteria.from,
    to: criteria.to,
    departureDate: criteria.departureDate,
    tripType: criteria.tripType,
    adultCount: String(criteria.adultCount),
    childCount: String(criteria.childCount),
    infantCount: String(criteria.infantCount)
  });

  if (criteria.tripType === "round_trip" && criteria.returnDate) {
    params.set("returnDate", criteria.returnDate);
  }

  if (criteria.fareFamily) {
    params.set("fareFamily", criteria.fareFamily);
  }

  return `/search?${params.toString()}`;
}

export async function fetchFlightSearch(
  criteria: ApiFlightSearchCriteria
): Promise<ApiFlightSearchResponse> {
  const params = new URLSearchParams({
    from: criteria.from,
    to: criteria.to,
    departureDate: criteria.departureDate,
    tripType: criteria.tripType,
    adultCount: String(criteria.adultCount),
    childCount: String(criteria.childCount),
    infantCount: String(criteria.infantCount)
  });

  if (criteria.tripType === "round_trip" && criteria.returnDate) {
    params.set("returnDate", criteria.returnDate);
  }

  if (criteria.fareFamily) {
    params.set("fareFamily", criteria.fareFamily);
  }

  let payload: Partial<ApiFlightSearchResponse>;

  try {
    payload = await requestApi<Partial<ApiFlightSearchResponse>>(
      `/api/flights/search?${params.toString()}`,
      {
        fallbackMessage: "Không tải được dữ liệu tìm chuyến bay.",
        method: "GET",
        showErrorToast: false
      }
    );
  } catch (error) {
    return toFlightSearchApiError(error);
  }

  if (
    !payload ||
    !laMangChuyenBayHopLe(payload.flights) ||
    !laMangChuyenBayHopLe(payload.outboundFlights) ||
    !laMangChuyenBayHopLe(payload.returnFlights) ||
    !laMangGoiGiaHopLe(payload.fares) ||
    !payload.criteria
  ) {
    throw new FlightSearchApiError("Dữ liệu tìm chuyến bay trả về không hợp lệ.", 500);
  }

  return payload as ApiFlightSearchResponse;
}
