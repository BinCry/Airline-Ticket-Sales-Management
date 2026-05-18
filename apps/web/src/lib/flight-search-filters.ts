import type { ApiFlightCard, FareFamily } from "@qlvmb/shared-types";

import { formatCurrency } from "@/lib/format";

export type SearchTimeSlot = "khuya" | "sang" | "chieu" | "toi";

export interface SearchBudgetOption {
  id: string;
  label: string;
  max: number | null;
  min: number;
}

export interface FlightSearchFilterState {
  budgetId: string | null;
  fareFamilies: FareFamily[];
  minimumSeats: 0 | 1 | 5 | 10;
  timeSlots: SearchTimeSlot[];
}

export const DEFAULT_FLIGHT_SEARCH_FILTER_STATE: FlightSearchFilterState = {
  budgetId: null,
  fareFamilies: [],
  minimumSeats: 0,
  timeSlots: []
};

const TIME_SLOT_LABELS: Record<SearchTimeSlot, string> = {
  khuya: "Khuya",
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối"
};

export function layNhanKhungGio(slot: SearchTimeSlot): string {
  return TIME_SLOT_LABELS[slot];
}

export function layKhungGioTheoChuyenBay(flight: ApiFlightCard): SearchTimeSlot {
  const gioKhoiHanh = Number.parseInt(flight.departureTime.slice(0, 2), 10);

  if (gioKhoiHanh >= 0 && gioKhoiHanh < 6) {
    return "khuya";
  }

  if (gioKhoiHanh < 12) {
    return "sang";
  }

  if (gioKhoiHanh < 18) {
    return "chieu";
  }

  return "toi";
}

function taoNhanKhoangGia(min: number, max: number | null): string {
  function dinhDangSoTrieu(gia: number): string | null {
    if (gia < 1_000_000) {
      return null;
    }

    const giaTheoTrieu = gia / 1_000_000;
    const boDinhDang = new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: giaTheoTrieu >= 10 ? 1 : 2,
      minimumFractionDigits: 0
    });

    return boDinhDang.format(giaTheoTrieu);
  }

  function dinhDangGiaNgan(gia: number): string {
    const soTrieu = dinhDangSoTrieu(gia);
    if (soTrieu) {
      return `${soTrieu} triệu`;
    }

    return formatCurrency(gia);
  }

  if (max === null) {
    return `Từ ${dinhDangGiaNgan(min)}`;
  }

  if (min <= 0) {
    return `Dưới ${dinhDangGiaNgan(max)}`;
  }

  const soTrieuToiThieu = dinhDangSoTrieu(min);
  const soTrieuToiDa = dinhDangSoTrieu(max);
  if (soTrieuToiThieu && soTrieuToiDa) {
    return `${soTrieuToiThieu} - ${soTrieuToiDa} triệu`;
  }

  return `${dinhDangGiaNgan(min)} - ${dinhDangGiaNgan(max)}`;
}

export function taoKhoangGiaDong(flights: ApiFlightCard[]): SearchBudgetOption[] {
  const danhSachGia = [...new Set(flights.map((flight) => flight.price))].sort((a, b) => a - b);

  if (danhSachGia.length === 0) {
    return [];
  }

  if (danhSachGia.length === 1) {
    const gia = danhSachGia[0];
    return [
      {
        id: `0-${gia}`,
        label: taoNhanKhoangGia(0, gia),
        min: 0,
        max: gia
      }
    ];
  }

  const chiSoCatMot = Math.max(0, Math.floor((danhSachGia.length - 1) / 3));
  const chiSoCatHai = Math.max(chiSoCatMot + 1, Math.floor(((danhSachGia.length - 1) * 2) / 3));
  const mocMot = danhSachGia[chiSoCatMot];
  const mocHai = danhSachGia[Math.min(chiSoCatHai, danhSachGia.length - 1)];

  const khoangGia: SearchBudgetOption[] = [
    {
      id: `0-${mocMot}`,
      label: taoNhanKhoangGia(0, mocMot),
      min: 0,
      max: mocMot
    }
  ];

  if (mocHai > mocMot) {
    khoangGia.push({
      id: `${mocMot + 1}-${mocHai}`,
      label: taoNhanKhoangGia(mocMot + 1, mocHai),
      min: mocMot + 1,
      max: mocHai
    });
  }

  if (danhSachGia.at(-1) !== mocHai) {
    khoangGia.push({
      id: `${mocHai + 1}-plus`,
      label: taoNhanKhoangGia(mocHai + 1, null),
      min: mocHai + 1,
      max: null
    });
  }

  return khoangGia;
}

export function locDanhSachChuyenBay(
  flights: ApiFlightCard[],
  filterState: FlightSearchFilterState,
  budgetOptions: SearchBudgetOption[]
): ApiFlightCard[] {
  const khoangGiaDangChon = budgetOptions.find((option) => option.id === filterState.budgetId) ?? null;

  return flights.filter((flight) => {
    if (filterState.timeSlots.length > 0 && !filterState.timeSlots.includes(layKhungGioTheoChuyenBay(flight))) {
      return false;
    }

    if (filterState.fareFamilies.length > 0 && !filterState.fareFamilies.includes(flight.fareFamily)) {
      return false;
    }

    if (filterState.minimumSeats > 0 && flight.seatsLeft < filterState.minimumSeats) {
      return false;
    }

    if (!khoangGiaDangChon) {
      return true;
    }

    if (flight.price < khoangGiaDangChon.min) {
      return false;
    }

    if (khoangGiaDangChon.max !== null && flight.price > khoangGiaDangChon.max) {
      return false;
    }

    return true;
  });
}
