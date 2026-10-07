"use client";

import { Fragment } from "react";
import type { ApiFlightSeatMap, FareFamily } from "@qlvmb/shared-types";
import { layLopMauGoiGia } from "@/lib/display";

interface SeatMapProps {
  map: ApiFlightSeatMap;
  label: string;
  fareFamily: FareFamily | null;
  selectedSeat: string;
  currentSeat?: string | null;
  unavailableSeats?: ReadonlySet<string>;
  disabled?: boolean;
  onSelect: (seatNumber: string) => void;
}

const fareLabels: Record<FareFamily, string> = {
  thuong_gia: "Thương gia",
  pho_thong_linh_hoat: "Phổ thông linh hoạt",
  pho_thong_tiet_kiem: "Phổ thông tiết kiệm"
};

export function SeatMap({ map, label, fareFamily, selectedSeat, currentSeat, unavailableSeats, disabled, onSelect }: SeatMapProps) {
  const seats = new Map(map.seats.map((seat) => [seat.seatNumber, seat]));
  return (
    <div className={`seat-map-card ${layLopMauGoiGia(fareFamily ?? "")}`} role="group" aria-label={label}>
      <p>{map.aircraftTypeName} • {map.aircraftRegistration}</p>
      <div className="seat-map-nose" aria-hidden="true">Mũi máy bay</div>
      <div className="seat-map-wing seat-map-wing-left" aria-hidden="true" />
      <div className="seat-map-wing seat-map-wing-right" aria-hidden="true" />
      <div className="seat-map-cabin seat-map-dynamic">
        {map.layout.rows.map((row) => (
          <Fragment key={row.row}>
            <span className="seat-zone-label">Hàng {row.row} • {fareLabels[row.fareFamily]}</span>
            <div className="seat-map-row">
              <span className="seat-row-number">{row.row}</span>
              {map.layout.columns.map((column) => {
                const number = `${row.row}${column}`;
                const seat = seats.get(number);
                const exists = row.seats.includes(column);
                const current = number === currentSeat;
                const selected = number === selectedSeat;
                const blocked = !seat || seat.disabled || map.layout.disabledSeats.includes(number)
                  || seat.fareFamily !== fareFamily || unavailableSeats?.has(number)
                  || (seat.occupied && !current);
                const status = seat?.disabled || map.layout.disabledSeats.includes(number) ? "Vô hiệu hóa"
                  : seat?.fareFamily !== fareFamily ? "Khác hạng vé"
                  : unavailableSeats?.has(number) ? "Đã chọn cho hành khách khác"
                  : seat?.occupied && !current ? "Đã có người giữ"
                  : selected ? "Đang chọn" : current ? "Ghế hiện tại" : "Còn trống";
                return (
                  <Fragment key={column}>
                    {exists ? (
                      <button type="button" className={[
                        "seat-button", selected ? "seat-button-selected" : "",
                        blocked ? "seat-button-unavailable" : "seat-button-priority"
                      ].filter(Boolean).join(" ")}
                        disabled={disabled || Boolean(blocked)} aria-pressed={selected}
                        aria-label={`Ghế ${number}, ${fareLabels[row.fareFamily]}, ${status}`}
                        title={status} onClick={() => onSelect(number)}>
                        <span>{number}</span><small aria-hidden="true">{blocked ? "×" : selected ? "✓" : current ? "●" : "○"}</small>
                      </button>
                    ) : <span className="seat-map-empty" aria-hidden="true" />}
                    {map.layout.aislesAfter.includes(column) ? <span className="seat-map-aisle" aria-hidden="true" /> : null}
                  </Fragment>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
      <p className="seat-map-summary" aria-live="polite">{selectedSeat ? `Đang chọn ghế ${selectedSeat}` : "Chưa chọn ghế"}</p>
      <p className="seat-map-legend">○ Còn trống • ✓ Đang chọn • ● Ghế hiện tại • × Không chọn được. Dùng Tab và Enter/Space để chọn.</p>
    </div>
  );
}
