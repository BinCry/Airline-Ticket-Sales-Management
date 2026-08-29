"use client";

import { startTransition, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { TRIP_TYPES, type AirportOption, type TripType } from "@qlvmb/shared-types";

import { DateField } from "@/components/date-field";
import { PassengerSelector } from "@/components/passenger-selector";
import { fetchAirportOptions } from "@/lib/airport-api";
import {
  taoDuongDanTimChuyenBay,
  taoTieuChiTimChuyenBayMacDinh
} from "@/lib/flight-search-api";
import {
  getVietnamTodayIso,
  resolveRoundTripReturnDate
} from "@/lib/public-flight-date";

const tripLabels: Record<TripType, string> = {
  one_way: "Một chiều",
  round_trip: "Khứ hồi"
};

export function FlightSearchPanel() {
  const router = useRouter();
  const [tieuChiMacDinh] = useState(() => taoTieuChiTimChuyenBayMacDinh());
  const [ngayHienTai] = useState(() => getVietnamTodayIso());
  const [tripType, setTripType] = useState<TripType>(tieuChiMacDinh.tripType);
  const [from, setFrom] = useState(tieuChiMacDinh.from);
  const [to, setTo] = useState(tieuChiMacDinh.to);
  const [departureDate, setDepartureDate] = useState(tieuChiMacDinh.departureDate);
  const [returnDate, setReturnDate] = useState(tieuChiMacDinh.returnDate ?? "");
  const [adultCount, setAdultCount] = useState(tieuChiMacDinh.adultCount);
  const [childCount, setChildCount] = useState(tieuChiMacDinh.childCount);
  const [infantCount, setInfantCount] = useState(tieuChiMacDinh.infantCount);
  const [dangChuyenTrang, setDangChuyenTrang] = useState(false);
  const [goiYSanBayDi, setGoiYSanBayDi] = useState<AirportOption[]>([]);
  const [goiYSanBayDen, setGoiYSanBayDen] = useState<AirportOption[]>([]);
  const [dangTaiSanBayDi, setDangTaiSanBayDi] = useState(false);
  const [dangTaiSanBayDen, setDangTaiSanBayDen] = useState(false);

  useEffect(() => {
    const tuKhoa = from.trim();

    if (!tuKhoa || /^[a-z]{3}$/i.test(tuKhoa)) {
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

    if (!tuKhoa || /^[a-z]{3}$/i.test(tuKhoa)) {
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

  function xuLyDoiChieu() {
    setFrom(to);
    setTo(from);
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

    const ngayKhoiHanh = departureDate || tieuChiMacDinh.departureDate;
    const duongDan = taoDuongDanTimChuyenBay({
      from: from.trim().toUpperCase() || tieuChiMacDinh.from,
      to: to.trim().toUpperCase() || tieuChiMacDinh.to,
      departureDate: ngayKhoiHanh,
      returnDate:
        tripType === "round_trip"
          ? resolveRoundTripReturnDate(ngayKhoiHanh, returnDate)
          : null,
      tripType,
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
        <div className="search-mini-metrics" aria-label="Thông tin dịch vụ">
          <div>
            <strong>15&apos;</strong>
            <span>Giữ chỗ</span>
          </div>
          <div>
            <strong>24h</strong>
            <span title="Mở làm thủ tục">Mở check-in</span>
          </div>
        </div>
      </div>
      <div className="toggle-group">
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
          <small role="status">
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
          <small role="status">
            {dangTaiSanBayDen
              ? "Đang tải gợi ý sân bay..."
              : "Gợi ý sân bay sẽ hiển thị khi bạn nhập mã hoặc tên thành phố."}
          </small>
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Ngày đi</span>
          <DateField
            min={ngayHienTai}
            value={departureDate}
            onChange={setDepartureDate}
          />
        </label>
        {tripType === "round_trip" ? (
          <label className="field">
            <span>Ngày về</span>
            <DateField
              min={departureDate || ngayHienTai}
              value={returnDate}
              onChange={setReturnDate}
            />
          </label>
        ) : null}
        <div className="passenger-selector-grid-item">
          <PassengerSelector
            counts={{ adult: adultCount, child: childCount, infant: infantCount }}
            onChange={(counts) => {
              setAdultCount(counts.adult);
              setChildCount(counts.child);
              setInfantCount(counts.infant);
            }}
          />
        </div>
      </div>
      <div className="search-assurance" aria-label="Quyền lợi khi tìm chuyến">
        <span className="assurance-chip">Giá từ Phổ thông tiết kiệm</span>
        <span className="assurance-chip">Đổi/hoàn theo điều kiện vé</span>
        <span className="assurance-chip">Thanh toán đa dạng</span>
        <span className="assurance-chip">Gửi vé điện tử tự động</span>
      </div>
      <div className="search-footer">
        <button
          type="submit"
          className="button button-primary"
          disabled={dangChuyenTrang}
        >
          {dangChuyenTrang ? "Đang mở kết quả" : "Tìm chuyến bay"}
        </button>
      </div>
    </form>
  );
}
