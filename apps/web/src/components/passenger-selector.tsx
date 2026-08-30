"use client";

import { useId, useState } from "react";

import { Drawer } from "@/components/ui/overlays";

export type PassengerCounts = {
  adult: number;
  child: number;
  infant: number;
};

type PassengerGroup = keyof PassengerCounts;

const passengerMeta: Array<{
  key: PassengerGroup;
  label: string;
  note: string;
}> = [
  { key: "adult", label: "Người lớn", note: "Từ 12 tuổi" },
  { key: "child", label: "Trẻ em", note: "Từ 2 đến 11 tuổi" },
  { key: "infant", label: "Em bé", note: "Dưới 2 tuổi" }
];

function totalPassengers(counts: PassengerCounts) {
  return counts.adult + counts.child + counts.infant;
}

export function PassengerSelector({
  counts,
  onChange
}: {
  counts: PassengerCounts;
  onChange: (counts: PassengerCounts) => void;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const total = totalPassengers(counts);

  function canDecrease(group: PassengerGroup) {
    if (group === "adult") return counts.adult > 1 && counts.adult - 1 >= counts.infant;
    return counts[group] > 0;
  }

  function canIncrease(group: PassengerGroup) {
    if (total >= 9) return false;
    if (group === "adult") return counts.adult < 9;
    if (group === "child") return counts.child < 8;
    return counts.infant < 8 && counts.infant + 1 <= counts.adult;
  }

  function update(group: PassengerGroup, delta: 1 | -1) {
    if (delta === 1 && !canIncrease(group)) return;
    if (delta === -1 && !canDecrease(group)) return;
    onChange({ ...counts, [group]: counts[group] + delta });
  }

  return (
    <>
      <div className="field passenger-selector-field">
        <span>Hành khách</span>
        <button
          type="button"
          className="passenger-selector-trigger"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <strong>{total} khách</strong>
          <small>{counts.adult} người lớn · {counts.child} trẻ em · {counts.infant} em bé</small>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="m7 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} labelId={titleId}>
        <div className="passenger-selector-sheet">
          <div className="passenger-selector-heading">
            <div>
              <span className="section-eyebrow">Hành trình</span>
              <h2 id={titleId}>Chọn hành khách</h2>
              <p>Tối đa 9 khách. Mỗi em bé cần đi cùng một người lớn.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Đóng bộ chọn hành khách"
            >
              ×
            </button>
          </div>

          <div className="passenger-counter-grid">
            {passengerMeta.map((item) => (
              <article key={item.key} className="passenger-counter-card">
                <div className="passenger-counter-copy">
                  <span>{item.label}</span>
                  <strong>{counts[item.key]}</strong>
                  <small>{item.note}</small>
                </div>
                <div className="passenger-stepper">
                  <button
                    type="button"
                    className="passenger-stepper-button"
                    onClick={() => update(item.key, -1)}
                    disabled={!canDecrease(item.key)}
                    aria-label={`Giảm số lượng ${item.label.toLowerCase()}`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="passenger-stepper-button"
                    onClick={() => update(item.key, 1)}
                    disabled={!canIncrease(item.key)}
                    aria-label={`Tăng số lượng ${item.label.toLowerCase()}`}
                  >
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="button button-primary passenger-selector-confirm"
            onClick={() => setOpen(false)}
          >
            Hoàn tất
          </button>
        </div>
      </Drawer>
    </>
  );
}
