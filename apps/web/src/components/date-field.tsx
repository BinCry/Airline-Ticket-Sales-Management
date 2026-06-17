"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatDateInputValue,
  isIsoDateWithinRange,
  normalizeDateInputDisplayValue,
  parseDateInputDisplayValue
} from "@/lib/format";

interface DateFieldProps {
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
  max?: string;
  min?: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}

export function DateField({
  ariaLabel,
  disabled = false,
  id,
  max,
  min,
  name,
  onChange,
  placeholder = "dd/mm/yy",
  required = false,
  value
}: DateFieldProps) {
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const [displayValue, setDisplayValue] = useState(() => formatDateInputValue(value));

  useEffect(() => {
    setDisplayValue(formatDateInputValue(value));
  }, [value]);

  function capNhatTinhHopLe(nextDisplayValue: string, nextIsoValue: string | null) {
    const textInput = textInputRef.current;
    if (!textInput) {
      return;
    }

    if (!nextDisplayValue) {
      textInput.setCustomValidity("");
      return;
    }

    if (!nextIsoValue) {
      textInput.setCustomValidity("Vui lòng nhập ngày theo định dạng dd/mm/yyyy.");
      return;
    }

    if (!isIsoDateWithinRange(nextIsoValue, min, max)) {
      textInput.setCustomValidity("Ngày đã chọn nằm ngoài phạm vi cho phép.");
      return;
    }

    textInput.setCustomValidity("");
  }

  function xuLyNhapTay(nextRawValue: string) {
    const nextDisplayValue = normalizeDateInputDisplayValue(nextRawValue);
    const nextIsoValue = parseDateInputDisplayValue(nextDisplayValue);

    setDisplayValue(nextDisplayValue);
    capNhatTinhHopLe(nextDisplayValue, nextIsoValue);

    if (!nextDisplayValue) {
      onChange("");
      return;
    }

    if (nextIsoValue && isIsoDateWithinRange(nextIsoValue, min, max)) {
      onChange(nextIsoValue);
    }
  }

  function xuLyRoiKhoiO() {
    const nextIsoValue = parseDateInputDisplayValue(displayValue);
    if (nextIsoValue && isIsoDateWithinRange(nextIsoValue, min, max)) {
      const nextFormattedValue = formatDateInputValue(nextIsoValue);
      setDisplayValue(nextFormattedValue);
      capNhatTinhHopLe(nextFormattedValue, nextIsoValue);
      onChange(nextIsoValue);
      return;
    }

    const fallbackValue = formatDateInputValue(value);
    setDisplayValue(fallbackValue);
    capNhatTinhHopLe(fallbackValue, value || null);
  }

  function moLichChonNgay() {
    if (disabled) {
      return;
    }

    const nativeInput = nativeInputRef.current;
    if (!nativeInput) {
      return;
    }

    if (typeof nativeInput.showPicker === "function") {
      nativeInput.showPicker();
      return;
    }

    nativeInput.focus();
    nativeInput.click();
  }

  return (
    <div className={`date-input-shell${disabled ? " is-disabled" : ""}`}>
      <input
        ref={textInputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={displayValue}
        onChange={(event) => xuLyNhapTay(event.target.value)}
        onBlur={xuLyRoiKhoiO}
        disabled={disabled}
        required={required}
      />
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        className="date-input-picker-button"
        onClick={moLichChonNgay}
        disabled={disabled}
        aria-label="Mở lịch chọn ngày"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="date-input-picker-icon"
        >
          <path
            d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8ZM5 6a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1H5Zm3 6h2v2H8v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <input
        ref={nativeInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="date-input-native-proxy"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          setDisplayValue(formatDateInputValue(event.target.value));
          capNhatTinhHopLe(event.target.value, event.target.value || null);
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
