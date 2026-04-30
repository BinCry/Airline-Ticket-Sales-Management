import {
  FARE_FAMILIES,
  type ApiFareCard,
  type ApiFlightCard,
  type ApiFlightSearchCriteria,
  type ApiFlightSearchResponse,
  type FareFamily
} from "@qlvmb/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type RawSearchParam = string | string[] | undefined;

export class FlightSearchApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FlightSearchApiError";
    this.status = status;
  }
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

function formatNgayTheoInput(date: Date): string {
  const nam = date.getFullYear();
  const thang = String(date.getMonth() + 1).padStart(2, "0");
  const ngay = String(date.getDate()).padStart(2, "0");
  return `${nam}-${thang}-${ngay}`;
}

function taoNgayMacDinh() {
  const homNay = new Date();
  const ngayDi = new Date(homNay);
  ngayDi.setDate(homNay.getDate() + 7);
  const ngayVe = new Date(ngayDi);
  ngayVe.setDate(ngayDi.getDate() + 3);

  return {
    departureDate: formatNgayTheoInput(ngayDi),
    returnDate: formatNgayTheoInput(ngayVe)
  };
}

export function chuanHoaTieuChiTimChuyenBay(
  searchParams: Record<string, RawSearchParam>
): ApiFlightSearchCriteria {
  const ngayMacDinh = taoNgayMacDinh();
  const tripType = chuanHoaLoaiHanhTrinh(searchParams.tripType);
  const departureDate = chuanHoaNgay(searchParams.departureDate, ngayMacDinh.departureDate);
  const returnDate = tripType === "one_way"
    ? null
    : chuanHoaNgay(searchParams.returnDate, ngayMacDinh.returnDate);

  return {
    from: chuanHoaMaSanBay(searchParams.from, "SGN"),
    to: chuanHoaMaSanBay(searchParams.to, "HAN"),
    departureDate,
    returnDate,
    tripType,
    fareFamily: chuanHoaGoiGia(searchParams.fareFamily),
    adultCount: chuanHoaSoLuong(searchParams.adultCount, 1, 1),
    childCount: chuanHoaSoLuong(searchParams.childCount, 0, 0),
    infantCount: chuanHoaSoLuong(searchParams.infantCount, 0, 0)
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

  const response = await fetch(`${API_BASE_URL}/api/flights/search?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    let message = "Không tải được dữ liệu tìm chuyến bay.";

    try {
      const payload = await response.json();

      if (typeof payload?.message === "string" && payload.message.trim()) {
        message = payload.message;
      }
    } catch {
      // Không làm gì thêm nếu backend không trả JSON.
    }

    throw new FlightSearchApiError(message, response.status);
  }

  const payload = (await response.json()) as Partial<ApiFlightSearchResponse>;

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
