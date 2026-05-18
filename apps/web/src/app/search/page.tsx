import type { ApiFlightSearchResponse } from "@qlvmb/shared-types";

import { SearchResultsPageClient } from "@/components/search-results-page-client";
import {
  FlightSearchApiError,
  chuanHoaTieuChiTimChuyenBay,
  fetchFlightSearch
} from "@/lib/flight-search-api";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function layGiaTriDauTien(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const criteria = chuanHoaTieuChiTimChuyenBay(resolvedSearchParams);
  const selectedOutboundRaw = layGiaTriDauTien(resolvedSearchParams.selectedOutbound).trim();
  const selectedOutboundInventoryId = Number.parseInt(selectedOutboundRaw, 10);
  const notice = layGiaTriDauTien(resolvedSearchParams.notice).trim() || null;

  let searchData: ApiFlightSearchResponse | null = null;
  let searchError: string | null = null;

  try {
    searchData = await fetchFlightSearch(criteria);
  } catch (error) {
    searchError =
      error instanceof FlightSearchApiError
        ? error.message
        : "Không tải được dữ liệu tìm chuyến bay lúc này.";
  }

  return (
    <SearchResultsPageClient
      criteria={criteria}
      notice={notice}
      searchData={searchData}
      searchError={searchError}
      selectedOutboundInventoryId={
        Number.isFinite(selectedOutboundInventoryId) ? selectedOutboundInventoryId : null
      }
    />
  );
}
