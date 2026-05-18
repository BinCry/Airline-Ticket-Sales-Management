import type { ApiFlightStatusResponse } from "@qlvmb/shared-types";

import { requestApi } from "@/lib/api-client";

export interface FlightStatusQuery {
  code?: string | null;
  date?: string | null;
}

export function taoDuongDanTinhTrangChuyenBay(query: FlightStatusQuery): string {
  const searchParams = new URLSearchParams();
  const code = query.code?.trim().toUpperCase();
  const date = query.date?.trim();

  if (code) {
    searchParams.set("code", code);
  }

  if (date) {
    searchParams.set("date", date);
  }

  const queryString = searchParams.toString();
  return queryString ? `/flight-status?${queryString}` : "/flight-status";
}

export async function fetchFlightStatus(
  query: FlightStatusQuery = {}
): Promise<ApiFlightStatusResponse> {
  const searchParams = new URLSearchParams();
  const code = query.code?.trim().toUpperCase();
  const date = query.date?.trim();

  if (code) {
    searchParams.set("code", code);
  }

  if (date) {
    searchParams.set("date", date);
  }

  const queryString = searchParams.toString();
  return requestApi<ApiFlightStatusResponse>(
    `/api/flights/status${queryString ? `?${queryString}` : ""}`,
    {
      fallbackMessage: "Không thể tải tình trạng chuyến bay lúc này.",
      showErrorToast: false
    }
  );
}
