"use client";

import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { TRIP_TYPES, type AirportOption, type FareFamily, type TripType } from "@qlvmb/shared-types";

import { fetchAirportOptions } from "@/lib/airport-api";
import { laGoiGiaHopLe, taoDuongDanTimChuyenBay } from "@/lib/flight-search-api";

const tripLabels: Record<TripType, string> = {
  one_way: "Một chiều",
  round_trip: "Khứ hồi",
  multi_city: "Nhiều chặng"
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDefaultDates() {
  const today = new Date();
  const departure = new Date(today);
  departure.setDate(today.getDate() + 7);
  const returnDate = new Date(departure);
  returnDate.setDate(departure.getDate() + 3);

  return {
    departureDate: toDateInputValue(departure),
    returnDate: toDateInputValue(returnDate)
  };
}

export function FlightSearchPanel() {
  const router = useRouter();
  const defaultDates = useMemo(buildDefaultDates, []);
  const [tripType, setTripType] = useState<TripType>("round_trip");
  const [from, setFrom] = useState("SGN");
  const [to, setTo] = useState("HAN");
  const [departureDate, setDepartureDate] = useState(defaultDates.departureDate);
  const [returnDate, setReturnDate] = useState(defaultDates.returnDate);
  const [fareFamily, setFareFamily] = useState<FareFamily>("pho_thong_linh_hoat");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [dangChuyenTrang, setDangChuyenTrang] = useState(false);
  const [goiYSanBayDi, setGoiYSanBayDi] = useState<AirportOption[]>([]);
  const [goiYSanBayDen, setGoiYSanBayDen] = useState<AirportOption[]>([]);
  const [dangTaiSanBayDi, setDangTaiSanBayDi] = useState(false);
  const [dangTaiSanBayDen, setDangTaiSanBayDen] = useState(false);
  const [loiGoiGia, setLoiGoiGia] = useState("");

  const passengerSummary = useMemo(() => {
    return `${adultCount} người lớn, ${childCount} trẻ em, ${infantCount} em bé`;
  }, [adultCount, childCount, infantCount]);

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

  function dieuChinhSoLuong(
    giaTri: number,
    giaTriMacDinh: number,
    soToiThieu: number,
    soToiDa: number
  ) {
    if (!Number.isFinite(giaTri)) {
      return giaTriMacDinh;
    }

    return Math.min(Math.max(giaTri, soToiThieu), soToiDa);
  }

  function xuLyDoiChieu() {
    setFrom(to);
    setTo(from);
  }

  function xuLyTimChuyenBay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (tripType === "multi_city") {
      return;
    }

    const goiGiaDuocChon = String(fareFamily);

    if (!laGoiGiaHopLe(goiGiaDuocChon)) {
      setLoiGoiGia("Hạng vé không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    setLoiGoiGia("");

    const duongDan = taoDuongDanTimChuyenBay({
      from: from.trim().toUpperCase(),
      to: to.trim().toUpperCase(),
      departureDate,
      returnDate: tripType === "round_trip" ? returnDate : null,
      tripType,
      fareFamily: goiGiaDuocChon,
      adultCount,
      childCount,
      infantCount
    });

    setDangChuyenTrang(true);
    startTransition(() => {
      router.push(duongDan);
    });
  }

  return (
    <form className="search-panel" onSubmit={xuLyTimChuyenBay}>
      <div className="search-panel-head">
        <div>
          <span className="panel-kicker">Tìm chuyến bay</span>
          <h2>Đặt vé nhanh cho hành trình nội địa</h2>
        </div>
        <div className="search-mini-metrics">
          <div>
            <strong>15&apos;</strong>
            <span>Giữ chỗ</span>
          </div>
          <div>
            <strong>24h</strong>
            <span>Mở làm thủ tục</span>
          </div>
        </div>
      </div>
      <div className="toggle-group">
        {TRIP_TYPES.map((item) => (
          <button
            key={item}
            type="button"
            className={tripType === item ? "toggle active" : "toggle"}
            onClick={() => setTripType(item)}
          >
            {tripLabels[item]}
          </button>
        ))}
      </div>
      <div className="search-note">
        Bạn đang chọn <strong>{tripLabels[tripType]}</strong>. Hệ thống hiện hỗ trợ tìm vé thật cho một chiều và
        khứ hồi, còn nhiều chặng mới dừng ở mức giao diện.
      </div>
      <div className="route-pair">
        <label className="field route-field">
          <span>Điểm đi</span>
          <input
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            placeholder="VD: SGN hoặc Hà Nội"
            list="goi-y-san-bay-di"
          />
          <datalist id="goi-y-san-bay-di">
            {goiYSanBayDi.map((sanBay) => (
              <option key={sanBay.code} value={sanBay.code}>
                {`${sanBay.cityName} (${sanBay.code}) - ${sanBay.airportName}`}
              </option>
            ))}
          </datalist>
          <small>
            {dangTaiSanBayDi
              ? "Đang tải gợi ý sân bay..."
              : "Nhập mã hoặc tên thành phố để nhận gợi ý sân bay."}
          </small>
        </label>
        <button
          type="button"
          className="swap-button"
          aria-label="Đảo chiều"
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
            list="goi-y-san-bay-den"
          />
          <datalist id="goi-y-san-bay-den">
            {goiYSanBayDen.map((sanBay) => (
              <option key={sanBay.code} value={sanBay.code}>
                {`${sanBay.cityName} (${sanBay.code}) - ${sanBay.airportName}`}
              </option>
            ))}
          </datalist>
          <small>
            {dangTaiSanBayDen
              ? "Đang tải gợi ý sân bay..."
              : "Gợi ý được lấy trực tiếp từ API sân bay backend."}
          </small>
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Ngày đi</span>
          <input
            type="date"
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Ngày về</span>
          <input
            type="date"
            value={tripType === "one_way" ? "" : returnDate}
            disabled={tripType === "one_way"}
            onChange={(event) => setReturnDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Hạng vé</span>
          <select
            value={fareFamily}
            onChange={(event) => {
              setFareFamily(event.target.value as FareFamily);
              setLoiGoiGia("");
            }}
          >
            <option value="pho_thong_tiet_kiem">Phổ thông tiết kiệm</option>
            <option value="pho_thong_linh_hoat">Phổ thông linh hoạt</option>
            <option value="thuong_gia">Thương gia</option>
          </select>
          {loiGoiGia ? <small>{loiGoiGia}</small> : null}
        </label>
        <div className="field field-inline">
          <span>Hành khách</span>
          <div className="counter-grid">
            <label>
              Người lớn
              <input
                type="number"
                min={1}
                max={9}
                value={adultCount}
                onChange={(event) =>
                  setAdultCount(dieuChinhSoLuong(Number(event.target.value), 1, 1, 9))
                }
              />
            </label>
            <label>
              Trẻ em
              <input
                type="number"
                min={0}
                max={8}
                value={childCount}
                onChange={(event) =>
                  setChildCount(dieuChinhSoLuong(Number(event.target.value), 0, 0, 8))
                }
              />
            </label>
            <label>
              Em bé
              <input
                type="number"
                min={0}
                max={8}
                value={infantCount}
                onChange={(event) =>
                  setInfantCount(dieuChinhSoLuong(Number(event.target.value), 0, 0, 8))
                }
              />
            </label>
          </div>
        </div>
      </div>
      {tripType === "multi_city" ? (
        <div className="multi-city-card">
          <strong>Lộ trình gợi ý</strong>
          <p>
            Chặng 1: Thành phố Hồ Chí Minh đến Hà Nội · Chặng 2: Hà Nội đến Đà Nẵng · Chặng 3: Đà Nẵng về Thành phố
            Hồ Chí Minh
          </p>
        </div>
      ) : null}
      <div className="search-assurance">
        <span className="assurance-chip">Đổi hoặc hoàn theo điều kiện giá vé</span>
        <span className="assurance-chip">Hỗ trợ thẻ, chuyển khoản và ví điện tử</span>
        <span className="assurance-chip">Gửi vé điện tử và thông tin hành trình tự động</span>
      </div>
      <div className="search-footer">
        <div>
          <strong>{passengerSummary}</strong>
          <p>
            {tripType === "multi_city"
              ? "Chế độ nhiều chặng hiện mới dừng ở mức gợi ý giao diện."
              : "Giữ chỗ trong 15 phút sau khi bạn chọn được chuyến bay phù hợp."}
          </p>
        </div>
        <button
          type="submit"
          className="button button-primary"
          disabled={tripType === "multi_city" || dangChuyenTrang}
        >
          {tripType === "multi_city"
            ? "Tạm thời chưa khả dụng"
            : dangChuyenTrang
              ? "Đang mở kết quả"
              : "Tìm chuyến bay"}
        </button>
      </div>
    </form>
  );
}
