"use client";

import { startTransition, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { TRIP_TYPES, type AirportOption, type TripType } from "@qlvmb/shared-types";

import { fetchAirportOptions } from "@/lib/airport-api";
import { TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH, taoDuongDanTimChuyenBay } from "@/lib/flight-search-api";

const tripLabels: Record<TripType, string> = {
  one_way: "Má»™t chiá»u",
  round_trip: "Khá»© há»“i",
};

export function FlightSearchPanel() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.tripType);
  const [from, setFrom] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.from);
  const [to, setTo] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.to);
  const [departureDate, setDepartureDate] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.departureDate);
  const [returnDate, setReturnDate] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.returnDate ?? "");
  const [adultCount, setAdultCount] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.adultCount);
  const [childCount, setChildCount] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.childCount);
  const [infantCount, setInfantCount] = useState(TIEU_CHI_TIM_CHUYEN_BAY_MAC_DINH.infantCount);
  const [dangChuyenTrang, setDangChuyenTrang] = useState(false);
  const [goiYSanBayDi, setGoiYSanBayDi] = useState<AirportOption[]>([]);
  const [goiYSanBayDen, setGoiYSanBayDen] = useState<AirportOption[]>([]);
  const [dangTaiSanBayDi, setDangTaiSanBayDi] = useState(false);
  const [dangTaiSanBayDen, setDangTaiSanBayDen] = useState(false);

  const passengerSummary = `${adultCount} ngÆ°á»i lá»›n, ${childCount} tráº» em, ${infantCount} em bÃ©`;

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

    const duongDan = taoDuongDanTimChuyenBay({
      from: from.trim().toUpperCase(),
      to: to.trim().toUpperCase(),
      departureDate,
      returnDate: tripType === "round_trip" ? returnDate : null,
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
          <span className="panel-kicker">TÃ¬m chuyáº¿n bay</span>
          <h2>Äáº·t vÃ© nhanh cho hÃ nh trÃ¬nh ná»™i Ä‘á»‹a</h2>
        </div>
        <div className="search-mini-metrics">
          <div>
            <strong>15&apos;</strong>
            <span>Giá»¯ chá»—</span>
          </div>
          <div>
            <strong>24h</strong>
            <span>Má»Ÿ lÃ m thá»§ tá»¥c</span>
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
        Báº¡n Ä‘ang chá»n <strong>{tripLabels[tripType]}</strong>. Hiá»‡n cÃ³ thá»ƒ tÃ¬m vÃ© cho má»™t chiá»u vÃ  khá»©
        há»“i; hÃ nh trÃ¬nh nhiá»u cháº·ng sáº½ Ä‘Æ°á»£c bá»• sung sau.
      </div>
      <div className="route-pair">
        <label className="field route-field">
          <span>Äiá»ƒm Ä‘i</span>
          <input
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            placeholder="VD: SGN hoáº·c HÃ  Ná»™i"
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
              ? "Äang táº£i gá»£i Ã½ sÃ¢n bay..."
              : "Nháº­p mÃ£ hoáº·c tÃªn thÃ nh phá»‘ Ä‘á»ƒ nháº­n gá»£i Ã½ sÃ¢n bay."}
          </small>
        </label>
        <button
          type="button"
          className="swap-button"
          aria-label="Äáº£o chiá»u"
          onClick={xuLyDoiChieu}
        >
          â‡„
        </button>
        <label className="field route-field">
          <span>Äiá»ƒm Ä‘áº¿n</span>
          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="VD: HAN hoáº·c ÄÃ  Náºµng"
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
              ? "Äang táº£i gá»£i Ã½ sÃ¢n bay..."
              : "Gá»£i Ã½ sÃ¢n bay sáº½ hiá»ƒn thá»‹ khi báº¡n nháº­p mÃ£ hoáº·c tÃªn thÃ nh phá»‘."}
          </small>
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>NgÃ y Ä‘i</span>
          <input
            type="date"
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span>NgÃ y vá»</span>
          <input
            type="date"
            value={tripType === "one_way" ? "" : returnDate}
            disabled={tripType === "one_way"}
            onChange={(event) => setReturnDate(event.target.value)}
          />
        </label>
        <div className="field field-inline">
          <span>HÃ nh khÃ¡ch</span>
          <div className="counter-grid">
            <label>
              NgÆ°á»i lá»›n
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
              Tráº» em
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
              Em bÃ©
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
      <div className="search-assurance">
        <span className="assurance-chip">GiÃ¡ tÃ¬m tháº¥y luÃ´n má»Ÿ Ä‘áº§u tá»« Phá»• thÃ´ng tiáº¿t kiá»‡m</span>
        <span className="assurance-chip">Äá»•i hoáº·c hoÃ n theo Ä‘iá»u kiá»‡n giÃ¡ vÃ©</span>
        <span className="assurance-chip">Há»— trá»£ tháº», chuyá»ƒn khoáº£n vÃ  vÃ­ Ä‘iá»‡n tá»­</span>
        <span className="assurance-chip">Gá»­i vÃ© Ä‘iá»‡n tá»­ vÃ  thÃ´ng tin hÃ nh trÃ¬nh tá»± Ä‘á»™ng</span>
      </div>
      <div className="search-footer">
        <div>
          <strong>{passengerSummary}</strong>
          <p>
            Giá»¯ chá»— trong 15 phÃºt sau khi báº¡n chá»n Ä‘Æ°á»£c chuyáº¿n bay phÃ¹ há»£p.
          </p>
        </div>
        <button
          type="submit"
          className="button button-primary"
          disabled={dangChuyenTrang}
        >
          {dangChuyenTrang ? "Äang má»Ÿ káº¿t quáº£" : "TÃ¬m chuyáº¿n bay"}
        </button>
      </div>
    </form>
  );
}


