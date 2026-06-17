"use client";

import { useEffect, useState, type ChangeEvent, type FocusEvent } from "react";

import {
  formatIsoDateForDisplay,
  parseDisplayDateToIso
} from "@/lib/public-flight-date";

interface VietnamDateInputProps {
  disabled?: boolean;
  min?: string;
  name?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  value: string;
}

function isAllowedDate(isoDate: string | null, min?: string) {
  if (!isoDate) {
    return false;
  }

  return !min || isoDate >= min;
}

export function VietnamDateInput({
  disabled = false,
  min,
  name,
  onChange,
  required = false,
  value
}: VietnamDateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatIsoDateForDisplay(value));

  useEffect(() => {
    setDisplayValue(formatIsoDateForDisplay(value));
  }, [value]);

  const parsedDisplayDate = parseDisplayDateToIso(displayValue);
  const hiddenValue = isAllowedDate(parsedDisplayDate, min) ? parsedDisplayDate ?? value : value;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextDisplayValue = event.target.value;
    const nextIsoDate = parseDisplayDateToIso(nextDisplayValue);
    setDisplayValue(nextDisplayValue);

    if (isAllowedDate(nextIsoDate, min)) {
      onChange?.(nextIsoDate ?? value);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const nextIsoDate = parseDisplayDateToIso(event.target.value);

    if (isAllowedDate(nextIsoDate, min)) {
      setDisplayValue(formatIsoDateForDisplay(nextIsoDate ?? value));
      return;
    }

    setDisplayValue(formatIsoDateForDisplay(value));
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
        autoComplete="off"
        value={displayValue}
        disabled={disabled}
        required={required}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {name ? <input type="hidden" name={name} value={hiddenValue} /> : null}
    </>
  );
}
