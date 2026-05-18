import type { AirportOption } from "@qlvmb/shared-types";

import { requestApi } from "@/lib/api-client";

function laChuoi(giaTri: unknown): giaTri is string {
  return typeof giaTri === "string";
}

function laSanBayHopLe(giaTri: unknown): giaTri is AirportOption {
  if (!giaTri || typeof giaTri !== "object") {
    return false;
  }

  const banGhi = giaTri as Record<string, unknown>;

  return (
    laChuoi(banGhi.code) &&
    laChuoi(banGhi.cityName) &&
    laChuoi(banGhi.airportName) &&
    laChuoi(banGhi.terminalLabel)
  );
}

export async function fetchAirportOptions(
  query: string,
  signal?: AbortSignal
): Promise<AirportOption[]> {
  const tuKhoa = query.trim();

  const params = new URLSearchParams({ query: tuKhoa });
  const payload = await requestApi<unknown[]>(
    `/api/airports?${params.toString()}`,
    {
      fallbackMessage: "Không tải được dữ liệu sân bay.",
      method: "GET",
      showErrorToast: false,
      signal
    }
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(laSanBayHopLe);
}
