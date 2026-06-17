"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { DateField } from "@/components/date-field";

interface FlightStatusLookupFormProps {
  code: string;
  date: string;
  ngayHienTai: string;
}

export function FlightStatusLookupForm({
  code,
  date,
  ngayHienTai
}: FlightStatusLookupFormProps) {
  const router = useRouter();
  const [flightCode, setFlightCode] = useState(code);
  const [flightDate, setFlightDate] = useState(date || ngayHienTai);

  function xuLyTraCuu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchParams = new URLSearchParams();
    if (flightCode.trim()) {
      searchParams.set("code", flightCode.trim().toUpperCase());
    }

    if (flightDate) {
      searchParams.set("date", flightDate);
    }

    const nextPath = searchParams.size > 0
      ? `/flight-status?${searchParams.toString()}`
      : "/flight-status";

    router.push(nextPath);
  }

  return (
    <form className="lookup-card" onSubmit={xuLyTraCuu}>
      <div className="field-grid compact-grid">
        <label className="field">
          <span>Mã chuyến bay</span>
          <input
            value={flightCode}
            onChange={(event) => setFlightCode(event.target.value)}
            placeholder="Ví dụ: VN5201"
          />
        </label>
        <label className="field">
          <span>Ngày bay</span>
          <DateField
            min={ngayHienTai}
            value={flightDate}
            onChange={setFlightDate}
          />
        </label>
        <button className="button button-primary" type="submit">
          Tra cứu chuyến bay
        </button>
      </div>
    </form>
  );
}
