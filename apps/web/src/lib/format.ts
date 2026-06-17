export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh"
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh"
});

function parseIsoDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function parseDateTimeValue(value: string): Date | null {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function parseIsoLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day ||
    parsedDate.getUTCHours() !== hour ||
    parsedDate.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    hour,
    minute
  };
}

function resolveTwoDigitYear(yearValue: number): number {
  const currentYear = new Date().getFullYear();
  const currentYearSuffix = currentYear % 100;

  if (yearValue <= currentYearSuffix + 5) {
    return 2000 + yearValue;
  }

  return 1900 + yearValue;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }

  const parsedDate =
    typeof value === "string"
      ? parseIsoDateOnly(value) ?? parseDateTimeValue(value)
      : value;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return typeof value === "string" ? value : "";
  }

  return dateFormatter.format(parsedDate);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }

  const parsedDate =
    typeof value === "string"
      ? parseDateTimeValue(value) ?? parseIsoDateOnly(value)
      : value;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return typeof value === "string" ? value : "";
  }

  return dateTimeFormatter.format(parsedDate);
}

export function formatDateInputValue(value: string): string {
  const parsedDate = parseIsoDateOnly(value);
  if (!parsedDate) {
    return value;
  }

  return formatDate(value);
}

export function formatDateTimeInputValue(value: string): string {
  const parsedDateTime = parseIsoLocalDateTime(value);
  if (!parsedDateTime) {
    return value;
  }

  return [
    `${padDatePart(parsedDateTime.day)}/${padDatePart(parsedDateTime.month)}/${parsedDateTime.year}`,
    `${padDatePart(parsedDateTime.hour)}:${padDatePart(parsedDateTime.minute)}`
  ].join(" ");
}

export function normalizeDateInputDisplayValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateInputDisplayValue(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 6 && digits.length !== 8) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year =
    digits.length === 6
      ? resolveTwoDigitYear(Number(digits.slice(4, 6)))
      : Number(digits.slice(4, 8));

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

export function parseDateTimeInputDisplayValue(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const isoLocalMatch = parseIsoLocalDateTime(trimmedValue);
  if (isoLocalMatch) {
    return [
      `${isoLocalMatch.year}-${padDatePart(isoLocalMatch.month)}-${padDatePart(isoLocalMatch.day)}`,
      `${padDatePart(isoLocalMatch.hour)}:${padDatePart(isoLocalMatch.minute)}`
    ].join("T");
  }

  const displayMatch =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s+(\d{1,2}):(\d{2})$/.exec(trimmedValue);
  if (!displayMatch) {
    return null;
  }

  const day = Number(displayMatch[1]);
  const month = Number(displayMatch[2]);
  const rawYear = Number(displayMatch[3]);
  const year =
    displayMatch[3].length === 2 ? resolveTwoDigitYear(rawYear) : rawYear;
  const hour = Number(displayMatch[4]);
  const minute = Number(displayMatch[5]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day ||
    parsedDate.getUTCHours() !== hour ||
    parsedDate.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return [
    `${year}-${padDatePart(month)}-${padDatePart(day)}`,
    `${padDatePart(hour)}:${padDatePart(minute)}`
  ].join("T");
}

export function isIsoDateWithinRange(
  value: string,
  minValue?: string,
  maxValue?: string
): boolean {
  if (!value) {
    return false;
  }

  if (minValue && value < minValue) {
    return false;
  }

  if (maxValue && value > maxValue) {
    return false;
  }

  return true;
}

export function isIsoDateTimeWithinRange(
  value: string,
  minValue?: string,
  maxValue?: string
): boolean {
  if (!value) {
    return false;
  }

  if (minValue && value < minValue) {
    return false;
  }

  if (maxValue && value > maxValue) {
    return false;
  }

  return true;
}
