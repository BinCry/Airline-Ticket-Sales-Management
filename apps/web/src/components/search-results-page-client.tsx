"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  TRIP_TYPES,
  type ApiFlightCard,
  type ApiFlightSearchCriteria,
  type ApiFlightSearchResponse,
  type AirportOption,
  type TripType
} from "@qlvmb/shared-types";

import { SectionHeading } from "@/components/section-heading";
import { StatusChip } from "@/components/status-chip";
import { VietnamDateInput } from "@/components/vietnam-date-input";
import { fetchAirportOptions } from "@/lib/airport-api";
import {
  BACKOFFICE_SALES_FLOW_QUERY_KEY,
  appendBackofficeSalesFlow,
  isBackofficeSalesFlowValue
} from "@/lib/backoffice-sales-flow";
import {
  createBookingHandoffUrl,
  createHandoffSegmentFromFlight
} from "@/lib/booking-flow";
import { hienThiHanhTrinh, hienThiTenGoiGia, layLopMauGoiGia } from "@/lib/display";
import {
  DEFAULT_FLIGHT_SEARCH_FILTER_STATE,
  type FlightSearchFilterState,
  type SearchTimeSlot,
  layNhanKhungGio,
  locDanhSachChuyenBay,
  taoKhoangGiaDong
} from "@/lib/flight-search-filters";
import {
  taoDuongDanTimChuyenBay,
  taoTieuChiTimChuyenBayMacDinh
} from "@/lib/flight-search-api";
import { formatCurrency } from "@/lib/format";
import {
  getVietnamTodayIso,
  resolveRoundTripReturnDate
} from "@/lib/public-flight-date";

const toneMap = {
  scheduled: "neutral",
  on_time: "success",
  boarding: "info",
  delayed: "warning",
  departed: "neutral",
  landed: "success",
  cancelled: "danger"
} as const;

const labelMap = {
  scheduled: "Lên lịch",
  on_time: "Đúng giờ",
  boarding: "Đang lên máy bay",
  delayed: "Trễ",
  departed: "Đã khởi hành",
  landed: "Đã hạ cánh",
  cancelled: "Hủy"
} as const;

const fareImageMap = {
  pho_thong_tiet_kiem: {
    src: "/images/pho-thong-tiet-kiem-vietnam-airline-3.jpg",
    alt: "Hình minh họa cho gói phổ thông tiết kiệm"
  },
  pho_thong_linh_hoat: {
    src: "/images/phothonglinhhoat-classess.jpg",
    alt: "Hình minh họa cho gói phổ thông linh hoạt"
  },
  thuong_gia: {
    src: "/images/thuonggia-classess.jpg",
    alt: "Hình minh họa cho gói thương gia"
  }
} as const;

const tripLabels: Record<TripType, string> = {
  one_way: "Một chiều",
  round_trip: "Khứ hồi",
};

const timeSlotOptions: SearchTimeSlot[] = ["khuya", "sang", "chieu", "toi"];
const minimumSeatOptions: Array<0 | 1 | 5 | 10> = [0, 1, 5, 10];
const airportDisplayOrder = [
  "SGN",
  "HAN",
  "DAD",
  "PQC",
  "CXR",
  "HUI",
  "VCA",
  "HPH",
  "VII",
  "VDH",
  "UIH",
  "THD",
  "DLI",
  "PXU",
  "BMV",
  "CAH",
  "VCL",
  "DIN",
  "TBB",
  "VCS",
  "VKG"
];
const routePresets = [
  { from: "SGN", to: "HAN", label: "TP. Hồ Chí Minh → Hà Nội" },
  { from: "SGN", to: "DAD", label: "TP. Hồ Chí Minh → Đà Nẵng" },
  { from: "HAN", to: "PQC", label: "Hà Nội → Phú Quốc" },
  { from: "DAD", to: "CXR", label: "Đà Nẵng → Nha Trang" },
  { from: "SGN", to: "VCA", label: "TP. Hồ Chí Minh → Cần Thơ" },
  { from: "HAN", to: "HUI", label: "Hà Nội → Huế" },
  { from: "SGN", to: "UIH", label: "TP. Hồ Chí Minh → Quy Nhơn" },
  { from: "HAN", to: "DLI", label: "Hà Nội → Đà Lạt" },
  { from: "SGN", to: "HPH", label: "TP. Hồ Chí Minh → Hải Phòng" }
] as const;

type NhomHanhKhach = "adult" | "child" | "infant";

interface SearchResultsPageClientProps {
  criteria: ApiFlightSearchCriteria;
  notice: string | null;
  searchData: ApiFlightSearchResponse | null;
  searchError: string | null;
  selectedOutboundFlightId: number | null;
}

interface PassengerCounterCardProps {
  disabledIncrease: boolean;
  disabledDecrease: boolean;
  label: string;
  note: string;
  onDecrease: () => void;
  onIncrease: () => void;
  value: number;
}

function PassengerCounterCard({
  disabledDecrease,
  disabledIncrease,
  label,
  note,
  onDecrease,
  onIncrease,
  value
}: PassengerCounterCardProps) {
  return (
    <article className="passenger-counter-card">
      <div className="passenger-counter-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <div className="passenger-stepper">
        <button
          type="button"
          className="passenger-stepper-button"
          onClick={onDecrease}
          disabled={disabledDecrease}
          aria-label={`Giảm số lượng ${label.toLowerCase()}`}
        >
          −
        </button>
        <button
          type="button"
          className="passenger-stepper-button"
          onClick={onIncrease}
          disabled={disabledIncrease}
          aria-label={`Tăng số lượng ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </article>
  );
}

function tongHanhKhach(adultCount: number, childCount: number, infantCount: number): number {
  return adultCount + childCount + infantCount;
}

function dinhDangNgay(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function hienThiThongBaoDieuHuong(notice: string | null): string | null {
  if (notice === "chon-chuyen-bay-truoc") {
    return "Hãy chọn ít nhất một chuyến bay một chiều hoặc khứ hồi trước khi chuyển sang bước nhập thông tin đặt vé.";
  }

  return null;
}

function capNhatDanhSachDaChon<T extends string>(values: T[], nextValue: T): T[] {
  if (values.includes(nextValue)) {
    return values.filter((value) => value !== nextValue);
  }

  return [...values, nextValue];
}

function taoDuongDanChonChieuDi(
  criteria: ApiFlightSearchCriteria,
  flight: ApiFlightCard,
  isBackofficeSalesFlow: boolean
) {
  const basePath = taoDuongDanTimChuyenBay(criteria);
  const [pathname, queryString] = basePath.split("?");
  const nextSearchParams = new URLSearchParams(queryString ?? "");
  nextSearchParams.set("selectedOutbound", String(flight.flightId));
  const nextPath = `${pathname}?${nextSearchParams.toString()}`;

  return isBackofficeSalesFlow ? appendBackofficeSalesFlow(nextPath) : nextPath;
}

function taoDuongDanDatVe(
  criteria: ApiFlightSearchCriteria,
  flights: ApiFlightCard[],
  isBackofficeSalesFlow: boolean
) {
  const bookingUrl = createBookingHandoffUrl(
    criteria,
    flights.map((flight) => createHandoffSegmentFromFlight(flight))
  );

  return isBackofficeSalesFlow ? appendBackofficeSalesFlow(bookingUrl) : bookingUrl;
}

function taoNhanSoGheToiThieu(value: 0 | 1 | 5 | 10): string {
  if (value === 0) {
    return "Mọi mức";
  }

  return `Từ ${value} ghế`;
}

function taoLopDanhSachChipBoLoc(soLuongLuaChon: number): string {
  if (soLuongLuaChon <= 1) {
    return "filter-chip-list filter-chip-list-balanced is-single-column";
  }

  if (soLuongLuaChon % 2 === 0) {
    return "filter-chip-list filter-chip-list-balanced is-two-columns";
  }

  return "filter-chip-list filter-chip-list-balanced is-three-columns";
}

function sapXepSanBayPhoBien(airports: AirportOption[]): AirportOption[] {
  return [...airports].sort((firstAirport, secondAirport) => {
    const firstIndex = airportDisplayOrder.indexOf(firstAirport.code);
    const secondIndex = airportDisplayOrder.indexOf(secondAirport.code);

    if (firstIndex === -1 && secondIndex === -1) {
      return firstAirport.code.localeCompare(secondAirport.code);
    }

    if (firstIndex === -1) {
      return 1;
    }

    if (secondIndex === -1) {
      return -1;
    }

    return firstIndex - secondIndex;
  });
}

function taoNhanSanBay(sanBay: AirportOption): string {
  return `${sanBay.cityName} (${sanBay.code})`;
}

function taoMoTaSanBay(sanBay: AirportOption): string {
  return `${sanBay.airportName} • ${sanBay.terminalLabel}`;
}

function taoTheKetQua(
  tieuDe: string,
  flights: ApiFlightCard[],
  criteria: ApiFlightSearchCriteria,
  selectedOutboundFlight: ApiFlightCard | null,
  isBackofficeSalesFlow: boolean
) {
  const selectedNotice =
    criteria.tripType === "round_trip" && tieuDe === "Chặng về" && selectedOutboundFlight
      ? `Chiều đi đã chọn: ${selectedOutboundFlight.code} • ${selectedOutboundFlight.departureTime} - ${selectedOutboundFlight.arrivalTime}`
      : null;

  if (flights.length === 0) {
    return (
      <article className="surface-card result-card">
        <div className="result-top">
          <div>
            <span className="section-eyebrow">{tieuDe}</span>
            <h3>Không tìm thấy chuyến bay phù hợp</h3>
            <p>
              {selectedNotice ??
                "Hãy đổi ngày bay, tuyến hoặc nới bộ lọc để xem thêm lựa chọn phù hợp."}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="stack-list">
      <div className="surface-card result-card">
        <div className="result-top">
          <div>
            <span className="section-eyebrow">{tieuDe}</span>
            <h3>{flights.length} chuyến bay phù hợp</h3>
            <p>
              {selectedNotice ??
                "Các lựa chọn đang còn chỗ và phù hợp với tiêu chí tìm kiếm hiện tại của bạn."}
            </p>
          </div>
        </div>
      </div>

      {flights.map((flight) => (
        <article key={`${tieuDe}-${flight.flightId}`} className="surface-card result-card">
          <div className="result-top">
            <div>
              <span className="section-eyebrow">Chuyến bay {flight.code}</span>
              <h3>{hienThiHanhTrinh(flight.from, flight.to)}</h3>
              <p>{flight.duration}</p>
            </div>
            <StatusChip tone={toneMap[flight.status]} label={labelMap[flight.status]} />
          </div>

          <div className="result-timeline">
            <div className="timeline-stop">
              <span>Khởi hành</span>
              <strong>{flight.departureTime}</strong>
            </div>
            <div className="timeline-line" />
            <div className="timeline-stop">
              <span>Hạ cánh</span>
              <strong>{flight.arrivalTime}</strong>
            </div>
          </div>

          <div className="result-grid result-grid-rich">
            <div className="result-metric-card">
              <div>
                <span>Giá mở đầu</span>
                <strong>{formatCurrency(flight.baseFare)}</strong>
              </div>
              {/* Đổi hình sang invoice.jpg — minh họa giá/thanh toán, phù hợp với "Giá mở đầu" */}
              <div className="result-metric-image">
                <Image
                  src="/images/ticket.jpg"
                  alt="Minh họa giá vé và thanh toán"
                  fill
                  sizes="(max-width: 768px) 100vw, 32vw"
                />
              </div>
            </div>
            <div className="result-metric-card">
              <div>
                <span>Tổng ghế còn bán</span>
                <strong>{flight.fares.reduce((tong, fare) => tong + fare.seatsLeft, 0)} ghế</strong>
              </div>
              {/* Đổi hình sang khoang ghế máy bay — phù hợp với "Tổng ghế còn bán" */}
              <div className="result-metric-image">
                <Image
                  src="/images/pho-thong-tiet-kiem-vietnam-airline-3.jpg"
                  alt="Khoang ghế máy bay minh họa cho số ghế còn bán"
                  fill
                  sizes="(max-width: 768px) 100vw, 32vw"
                />
              </div>
            </div>
            <div className="result-grid-fare-box">
              <span>Theo 3 hạng vé</span>
              <ul className="list-clean result-fare-list">
                {flight.fares.map((fare) => (
                  <li
                    key={`${flight.flightId}-${fare.inventoryId}`}
                    className={`fare-list-item ${layLopMauGoiGia(fare.fareFamily)}`}
                  >
                    <strong>{hienThiTenGoiGia(fare.fareFamily)}</strong>
                    <span>
                      {formatCurrency(fare.price)} • còn {fare.seatsLeft} ghế
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="result-actions">
            <div className="assurance-row">
              <span className="assurance-chip">Giữ chỗ 15 phút</span>
              <span className="assurance-chip">Hiển thị điều kiện đổi hoặc hoàn</span>
            </div>
            {criteria.tripType === "one_way" ? (
              <Link
                href={taoDuongDanDatVe(criteria, [flight], isBackofficeSalesFlow)}
                className="button button-primary"
              >
                Chọn chuyến này
              </Link>
            ) : tieuDe === "Chặng đi" ? (
              <Link
                href={taoDuongDanChonChieuDi(criteria, flight, isBackofficeSalesFlow)}
                scroll={false}
                className={`button ${selectedOutboundFlight?.flightId === flight.flightId
                    ? "button-secondary"
                    : "button-primary"
                  }`}
              >
                {selectedOutboundFlight?.flightId === flight.flightId
                  ? "Đã chọn chiều đi"
                  : "Chọn chiều đi"}
              </Link>
            ) : !selectedOutboundFlight ? (
              <button type="button" className="button button-secondary" disabled>
                Chọn chiều đi trước
              </button>
            ) : (
              <Link
                href={taoDuongDanDatVe(criteria, [selectedOutboundFlight, flight], isBackofficeSalesFlow)}
                className="button button-primary"
              >
                Chọn chiều về
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function SearchResultsPageClient({
  criteria,
  notice,
  searchData,
  searchError,
  selectedOutboundFlightId
}: SearchResultsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tieuChiMacDinh] = useState(() => taoTieuChiTimChuyenBayMacDinh());
  const [ngayHienTai] = useState(() => getVietnamTodayIso());
  const [tripType, setTripType] = useState<TripType>(criteria.tripType);
  const [from, setFrom] = useState(criteria.from);
  const [to, setTo] = useState(criteria.to);
  const [departureDate, setDepartureDate] = useState(criteria.departureDate);
  const [returnDate, setReturnDate] = useState(
    criteria.tripType === "round_trip"
      ? resolveRoundTripReturnDate(criteria.departureDate, criteria.returnDate)
      : ""
  );
  const [adultCount, setAdultCount] = useState(criteria.adultCount);
  const [childCount, setChildCount] = useState(criteria.childCount);
  const [infantCount, setInfantCount] = useState(criteria.infantCount);
  const [dangTaiKetQua, setDangTaiKetQua] = useState(false);
  const [goiYSanBayDi, setGoiYSanBayDi] = useState<AirportOption[]>([]);
  const [goiYSanBayDen, setGoiYSanBayDen] = useState<AirportOption[]>([]);
  const [sanBayPhoBien, setSanBayPhoBien] = useState<AirportOption[]>([]);
  const [dangTaiSanBayDi, setDangTaiSanBayDi] = useState(false);
  const [dangTaiSanBayDen, setDangTaiSanBayDen] = useState(false);
  const [filterState, setFilterState] = useState<FlightSearchFilterState>(
    DEFAULT_FLIGHT_SEARCH_FILTER_STATE
  );
  const isBackofficeSalesFlow = isBackofficeSalesFlowValue(
    searchParams.get(BACKOFFICE_SALES_FLOW_QUERY_KEY)
  );

  useEffect(() => {
    setTripType(criteria.tripType);
    setFrom(criteria.from);
    setTo(criteria.to);
    setDepartureDate(criteria.departureDate);
    setReturnDate(
      criteria.tripType === "round_trip"
        ? resolveRoundTripReturnDate(criteria.departureDate, criteria.returnDate)
        : ""
    );
    setAdultCount(criteria.adultCount);
    setChildCount(criteria.childCount);
    setInfantCount(criteria.infantCount);
    setDangTaiKetQua(false);
    setFilterState(DEFAULT_FLIGHT_SEARCH_FILTER_STATE);
  }, [criteria]);

  useEffect(() => {
    if (departureDate && departureDate >= ngayHienTai) {
      return;
    }

    setDepartureDate(ngayHienTai);
  }, [departureDate, ngayHienTai]);

  useEffect(() => {
    if (tripType !== "round_trip") {
      return;
    }

    const ngayKhoiHanh = departureDate || ngayHienTai;
    setReturnDate((currentReturnDate) =>
      resolveRoundTripReturnDate(ngayKhoiHanh, currentReturnDate)
    );
  }, [departureDate, ngayHienTai, tripType]);

  useEffect(() => {
    const boDieuKhien = new AbortController();

    async function taiSanBayPhoBien() {
      try {
        const danhSach = await fetchAirportOptions("", boDieuKhien.signal);
        setSanBayPhoBien(sapXepSanBayPhoBien(danhSach));
      } catch {
        if (!boDieuKhien.signal.aborted) {
          setSanBayPhoBien([]);
        }
      }
    }

    void taiSanBayPhoBien();

    return () => {
      boDieuKhien.abort();
    };
  }, []);

  useEffect(() => {
    const tuKhoa = from.trim();

    if (!tuKhoa) {
      setGoiYSanBayDi([]);
      setDangTaiSanBayDi(false);
      return;
    }

    const boDieuKhien = new AbortController();
    const boDem = setTimeout(async () => {
      setDangTaiSanBayDi(true);

      try {
        const danhSach = await fetchAirportOptions(tuKhoa, boDieuKhien.signal);
        setGoiYSanBayDi(danhSach);
      } catch {
        if (!boDieuKhien.signal.aborted) {
          setGoiYSanBayDi([]);
        }
      } finally {
        if (!boDieuKhien.signal.aborted) {
          setDangTaiSanBayDi(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(boDem);
      boDieuKhien.abort();
    };
  }, [from]);

  useEffect(() => {
    const tuKhoa = to.trim();

    if (!tuKhoa) {
      setGoiYSanBayDen([]);
      setDangTaiSanBayDen(false);
      return;
    }

    const boDieuKhien = new AbortController();
    const boDem = setTimeout(async () => {
      setDangTaiSanBayDen(true);

      try {
        const danhSach = await fetchAirportOptions(tuKhoa, boDieuKhien.signal);
        setGoiYSanBayDen(danhSach);
      } catch {
        if (!boDieuKhien.signal.aborted) {
          setGoiYSanBayDen([]);
        }
      } finally {
        if (!boDieuKhien.signal.aborted) {
          setDangTaiSanBayDen(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(boDem);
      boDieuKhien.abort();
    };
  }, [to]);

  const outboundFlightsRaw = searchData?.outboundFlights ?? [];
  const returnFlightsRaw = searchData?.returnFlights ?? [];
  const allFlights = [...outboundFlightsRaw, ...returnFlightsRaw];
  const budgetOptions = taoKhoangGiaDong(allFlights);
  const outboundFlights = locDanhSachChuyenBay(outboundFlightsRaw, filterState, budgetOptions);
  const returnFlights = locDanhSachChuyenBay(returnFlightsRaw, filterState, budgetOptions);
  const selectedOutboundFlight =
    selectedOutboundFlightId === null
      ? null
      : outboundFlightsRaw.find((flight) => flight.flightId === selectedOutboundFlightId) ?? null;
  const thongBaoDieuHuong = hienThiThongBaoDieuHuong(notice);
  const passengerSummary = `${adultCount} người lớn, ${childCount} trẻ em, ${infantCount} em bé`;
  const tongKhach = tongHanhKhach(adultCount, childCount, infantCount);
  const sanBayDiPhoBien = sanBayPhoBien.slice(0, 6);
  const sanBayDenPhoBien = sanBayPhoBien.filter((sanBay) => sanBay.code !== from).slice(0, 6);

  function coTheTangHanhKhach(nhom: NhomHanhKhach): boolean {
    if (tongKhach >= 9) {
      return false;
    }

    if (nhom === "adult") {
      return adultCount < 9;
    }

    if (nhom === "child") {
      return childCount < 8;
    }

    return infantCount < 8 && infantCount + 1 <= adultCount;
  }

  function coTheGiamHanhKhach(nhom: NhomHanhKhach): boolean {
    if (nhom === "adult") {
      return adultCount > 1 && adultCount - 1 >= infantCount;
    }

    if (nhom === "child") {
      return childCount > 0;
    }

    return infantCount > 0;
  }

  function capNhatHanhKhach(nhom: NhomHanhKhach, delta: 1 | -1) {
    let nextAdultCount = adultCount;
    let nextChildCount = childCount;
    let nextInfantCount = infantCount;

    if (nhom === "adult") {
      if (delta === 1 && !coTheTangHanhKhach("adult")) {
        return;
      }

      if (delta === -1 && !coTheGiamHanhKhach("adult")) {
        return;
      }

      nextAdultCount += delta;
    }

    if (nhom === "child") {
      if (delta === 1 && !coTheTangHanhKhach("child")) {
        return;
      }

      if (delta === -1 && !coTheGiamHanhKhach("child")) {
        return;
      }

      nextChildCount += delta;
    }

    if (nhom === "infant") {
      if (delta === 1 && !coTheTangHanhKhach("infant")) {
        return;
      }

      if (delta === -1 && !coTheGiamHanhKhach("infant")) {
        return;
      }

      nextInfantCount += delta;
    }

    setAdultCount(nextAdultCount);
    setChildCount(nextChildCount);
    setInfantCount(nextInfantCount);
  }

  function chonSanBay(nhom: "from" | "to", airportCode: string) {
    const maSanBay = airportCode.toUpperCase();

    if (nhom === "from") {
      setFrom(maSanBay);
      return;
    }

    setTo(maSanBay);
  }

  function xuLyDoiChieu() {
    setFrom(to);
    setTo(from);
  }

  function xuLyChonTuyenNhanh(route: (typeof routePresets)[number]) {
    setFrom(route.from);
    setTo(route.to);
  }

  function capNhatLoaiHanhTrinh(loaiHanhTrinh: TripType) {
    setTripType(loaiHanhTrinh);

    if (loaiHanhTrinh !== "round_trip") {
      return;
    }

    const ngayKhoiHanh = departureDate || tieuChiMacDinh.departureDate;
    setReturnDate((currentReturnDate) =>
      resolveRoundTripReturnDate(ngayKhoiHanh, currentReturnDate)
    );
  }

  function xuLyTimChuyenBay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDangTaiKetQua(true);
    const ngayKhoiHanh = departureDate || tieuChiMacDinh.departureDate;
    const ngayVe =
      tripType === "round_trip"
        ? resolveRoundTripReturnDate(ngayKhoiHanh, returnDate)
        : null;

    startTransition(() => {
      const nextSearchUrl = taoDuongDanTimChuyenBay({
        from: from.trim().toUpperCase() || tieuChiMacDinh.from,
        to: to.trim().toUpperCase() || tieuChiMacDinh.to,
        departureDate: ngayKhoiHanh,
        returnDate: ngayVe,
        tripType,
        adultCount,
        childCount,
        infantCount
      });

      router.push(
        isBackofficeSalesFlow ? appendBackofficeSalesFlow(nextSearchUrl) : nextSearchUrl,
        { scroll: false }
      );
    });
  }

  function xuLyBatTatKhungGio(slot: SearchTimeSlot) {
    setFilterState((currentState) => ({
      ...currentState,
      timeSlots: capNhatDanhSachDaChon(currentState.timeSlots, slot)
    }));
  }

  return (
    <section className="section">
      <div className="container">
        {thongBaoDieuHuong ? (
          <>
            <article className="surface-card booking-inline-info">
              <strong>Bạn cần chọn chuyến bay trước</strong>
              <p>{thongBaoDieuHuong}</p>
            </article>
            <div className="section-gap" />
          </>
        ) : null}

        <form id="dat-ve" className="surface-card search-toolbar-card" onSubmit={xuLyTimChuyenBay}>
          <div className="search-toolbar-head">
            <div>
              <span className="section-eyebrow">Cập nhật hành trình</span>
              <h2>Tìm lại chuyến bay ngay trên trang kết quả</h2>
            </div>
            <p>{passengerSummary}</p>
          </div>

          <div className="toggle-group search-toolbar-trip-type">
            {TRIP_TYPES.map((item) => (
              <button
                key={item}
                type="button"
                className={tripType === item ? "toggle active" : "toggle"}
                onClick={() => capNhatLoaiHanhTrinh(item)}
              >
                {tripLabels[item]}
              </button>
            ))}
          </div>

          <div className="search-toolbar-grid">
            <div className="search-toolbar-main-fields">
              <div className="route-pair search-toolbar-route-pair">
                <label className="field route-field">
                  <span>Điểm đi</span>
                  <input
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    placeholder="VD: SGN hoặc Hà Nội"
                    list="toolbar-goi-y-san-bay-di"
                  />
                  <datalist id="toolbar-goi-y-san-bay-di">
                    {goiYSanBayDi.map((sanBay) => (
                      <option key={sanBay.code} value={sanBay.code}>
                        {`${sanBay.cityName} (${sanBay.code}) - ${sanBay.airportName}`}
                      </option>
                    ))}
                  </datalist>
                  <small>
                    {dangTaiSanBayDi
                      ? "Đang tải gợi ý sân bay..."
                      : "Nhập mã hoặc tên thành phố để nhận gợi ý nhanh."}
                  </small>
                </label>

                <button
                  type="button"
                  className="swap-button search-toolbar-swap"
                  aria-label="Đảo chiều hành trình"
                  onClick={xuLyDoiChieu}
                >
                  ⇄
                </button>

                <label className="field route-field">
                  <span>Điểm đến</span>
                  <input
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="VD: HAN hoặc Đà Nẵng"
                    list="toolbar-goi-y-san-bay-den"
                  />
                  <datalist id="toolbar-goi-y-san-bay-den">
                    {goiYSanBayDen.map((sanBay) => (
                      <option key={sanBay.code} value={sanBay.code}>
                        {`${sanBay.cityName} (${sanBay.code}) - ${sanBay.airportName}`}
                      </option>
                    ))}
                  </datalist>
                  <small>
                    {dangTaiSanBayDen
                      ? "Đang tải gợi ý sân bay..."
                      : "Có thể nhập mã sân bay hoặc tên thành phố."}
                  </small>
                </label>
              </div>

              <div className="search-toolbar-detail-grid">
                <label className="field">
                  <span>Ngày đi</span>
                  <VietnamDateInput
                    min={ngayHienTai}
                    value={departureDate}
                    onChange={setDepartureDate}
                  />
                </label>

                <label className="field">
                  <span>Ngày về</span>
                  <VietnamDateInput
                    min={departureDate || ngayHienTai}
                    value={tripType === "one_way" ? "" : returnDate}
                    disabled={tripType === "one_way"}
                    onChange={setReturnDate}
                  />
                </label>
              </div>

              <div className="search-toolbar-support-grid">
                <div className="search-toolbar-support-card">
                  <span className="search-toolbar-support-title">Điểm đi phổ biến</span>
                  <div className="filter-chip-list">
                    {sanBayDiPhoBien.map((sanBay) => (
                      <button
                        key={`from-${sanBay.code}`}
                        type="button"
                        className={
                          from === sanBay.code
                            ? "assurance-chip filter-chip-button active"
                            : "assurance-chip filter-chip-button"
                        }
                        onClick={() => chonSanBay("from", sanBay.code)}
                        title={taoMoTaSanBay(sanBay)}
                      >
                        {taoNhanSanBay(sanBay)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="search-toolbar-support-card">
                  <span className="search-toolbar-support-title">Điểm đến phổ biến</span>
                  <div className="filter-chip-list">
                    {sanBayDenPhoBien.map((sanBay) => (
                      <button
                        key={`to-${sanBay.code}`}
                        type="button"
                        className={
                          to === sanBay.code
                            ? "assurance-chip filter-chip-button active"
                            : "assurance-chip filter-chip-button"
                        }
                        onClick={() => chonSanBay("to", sanBay.code)}
                        title={taoMoTaSanBay(sanBay)}
                      >
                        {taoNhanSanBay(sanBay)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="search-toolbar-route-presets">
                <span className="search-toolbar-support-title">Tuyến phổ biến</span>
                <div className="route-preset-grid">
                  {routePresets.map((route) => (
                    <button
                      key={`${route.from}-${route.to}`}
                      type="button"
                      className={
                        from === route.from && to === route.to
                          ? "route-preset-button route-preset-button-active"
                          : "route-preset-button"
                      }
                      onClick={() => xuLyChonTuyenNhanh(route)}
                    >
                      <strong>{route.label}</strong>
                      <span>{route.from} → {route.to}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="search-toolbar-passenger-panel">
              <div className="search-toolbar-passenger-head">
                <div>
                  <span className="search-toolbar-support-title">Hành khách</span>
                  <strong>{tongKhach} khách</strong>
                </div>
                <p>Tối đa 9 khách, số em bé không vượt quá số người lớn.</p>
              </div>

              <div className="passenger-counter-grid">
                <PassengerCounterCard
                  label="Người lớn"
                  note="Từ 12 tuổi"
                  value={adultCount}
                  disabledDecrease={!coTheGiamHanhKhach("adult")}
                  disabledIncrease={!coTheTangHanhKhach("adult")}
                  onDecrease={() => capNhatHanhKhach("adult", -1)}
                  onIncrease={() => capNhatHanhKhach("adult", 1)}
                />
                <PassengerCounterCard
                  label="Trẻ em"
                  note="Từ 2 đến dưới 12 tuổi"
                  value={childCount}
                  disabledDecrease={!coTheGiamHanhKhach("child")}
                  disabledIncrease={!coTheTangHanhKhach("child")}
                  onDecrease={() => capNhatHanhKhach("child", -1)}
                  onIncrease={() => capNhatHanhKhach("child", 1)}
                />
                <PassengerCounterCard
                  label="Em bé"
                  note="Dưới 2 tuổi"
                  value={infantCount}
                  disabledDecrease={!coTheGiamHanhKhach("infant")}
                  disabledIncrease={!coTheTangHanhKhach("infant")}
                  onDecrease={() => capNhatHanhKhach("infant", -1)}
                  onIncrease={() => capNhatHanhKhach("infant", 1)}
                />
              </div>
            </div>
          </div>

          <div className="search-toolbar-action-row">
            <div className="search-toolbar-action-copy">
              <strong>{passengerSummary}</strong>
              <p>Bạn có thể đổi nhanh tuyến, ngày bay và nhóm hành khách để xem thêm lựa chọn phù hợp.</p>
            </div>
            <button
              className="button button-primary search-toolbar-submit"
              type="submit"
              disabled={dangTaiKetQua}
            >
              {dangTaiKetQua ? "Đang cập nhật" : "Cập nhật kết quả"}
            </button>
          </div>
        </form>

        <div className="section-gap" />
        <div className="search-layout">
          <section className="surface-card filter-card">
            <div className="filter-head">
              <div>
                <h3>Bộ lọc kết quả</h3>
                <p>Lọc ngay trên danh sách chuyến bay để rút ngắn thời gian so sánh và chọn vé.</p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setFilterState(DEFAULT_FLIGHT_SEARCH_FILTER_STATE)}
              >
                Xóa bộ lọc
              </button>
            </div>

            <div className="filter-toolbar-grid">
              <div className="search-filter-section">
                <span className="search-filter-title">Giờ bay</span>
                <div className={taoLopDanhSachChipBoLoc(timeSlotOptions.length)}>
                  {timeSlotOptions.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={
                        filterState.timeSlots.includes(slot)
                          ? "assurance-chip filter-chip-button active"
                          : "assurance-chip filter-chip-button"
                      }
                      onClick={() => xuLyBatTatKhungGio(slot)}
                    >
                      {layNhanKhungGio(slot)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="search-filter-section">
                <span className="search-filter-title">Ngân sách mở đầu</span>
                <p className="filter-note filter-note-inline">
                  Tính theo giá Phổ thông tiết kiệm của từng chuyến bay.
                </p>
                <div className={taoLopDanhSachChipBoLoc(Math.max(budgetOptions.length, 1))}>
                  {budgetOptions.length > 0 ? (
                    budgetOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          filterState.budgetId === option.id
                            ? "assurance-chip filter-chip-button active"
                            : "assurance-chip filter-chip-button"
                        }
                        onClick={() =>
                          setFilterState((currentState) => ({
                            ...currentState,
                            budgetId: currentState.budgetId === option.id ? null : option.id
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    ))
                  ) : (
                    <p className="filter-note">Bộ giá sẽ hiện khi có chuyến bay phù hợp.</p>
                  )}
                </div>
              </div>

              <div className="search-filter-section">
                <span className="search-filter-title">Còn ghế</span>
                <div className={taoLopDanhSachChipBoLoc(minimumSeatOptions.length)}>
                  {minimumSeatOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        filterState.minimumSeats === value
                          ? "assurance-chip filter-chip-button active"
                          : "assurance-chip filter-chip-button"
                      }
                      onClick={() =>
                        setFilterState((currentState) => ({
                          ...currentState,
                          minimumSeats: value
                        }))
                      }
                    >
                      {taoNhanSoGheToiThieu(value)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-summary-row">
              <div className="filter-note">
                Mỗi chuyến bay đều có đủ Phổ thông tiết kiệm, Phổ thông linh hoạt và Thương gia.
              </div>
              {criteria.tripType === "round_trip" ? (
                <div className="filter-note">
                  {selectedOutboundFlight
                    ? `Đã chọn chiều đi: ${selectedOutboundFlight.code} • ${selectedOutboundFlight.departureTime}`
                    : "Hãy chọn chiều đi trước khi chốt chiều về."}
                </div>
              ) : null}
            </div>
          </section>

          <div className="stack-list">
            {searchError ? (
              <article className="surface-card result-card">
                <div className="result-top">
                  <div>
                    <span className="section-eyebrow">Không thể tải dữ liệu</span>
                    <h3>Không thể lấy kết quả tìm chuyến bay</h3>
                    <p>{searchError}</p>
                  </div>
                </div>
              </article>
            ) : (
              <>
                {taoTheKetQua(
                  "Chặng đi",
                  outboundFlights,
                  criteria,
                  selectedOutboundFlight,
                  isBackofficeSalesFlow
                )}
                {criteria.tripType === "round_trip"
                  ? taoTheKetQua(
                    "Chặng về",
                    returnFlights,
                    criteria,
                    selectedOutboundFlight,
                    isBackofficeSalesFlow
                  )
                  : null}
              </>
            )}
          </div>
        </div>

        {searchData?.fares.length ? (
          <>
            <div className="section-gap" />
            <SectionHeading
              eyebrow="So sánh hạng vé"
              title="So sánh ba hạng vé cố định trước khi chọn chỗ"
              description="Mỗi chuyến bay đều có đủ Phổ thông tiết kiệm, Phổ thông linh hoạt và Thương gia để bạn cân đối nhu cầu và ngân sách ngay từ bước tìm chuyến."
            />
            <div className="card-grid card-grid-3">
              {searchData.fares.map((fare) => (
                <article key={fare.title} className={`surface-card fare-card ${layLopMauGoiGia(fare.fareFamily)}`}>
                  <div className="fare-card-image">
                    <Image
                      src={fareImageMap[fare.fareFamily].src}
                      alt={fareImageMap[fare.fareFamily].alt}
                      fill
                      sizes="(max-width: 820px) 100vw, 360px"
                    />
                  </div>
                  <span className="pill fare-pill">{fare.title}</span>
                  <strong className="fare-price">{formatCurrency(fare.price)}</strong>
                  <ul className="list-clean">
                    {fare.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

