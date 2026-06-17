const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: REPORT_TIME_ZONE
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: REPORT_TIME_ZONE
});

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

function extractFormatterPart(parts: Intl.DateTimeFormatPart[], partType: string) {
  return parts.find((part) => part.type === partType)?.value ?? "";
}

function resolveDateValue(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function formatDateFromParts(parts: Intl.DateTimeFormatPart[]) {
  const day = extractFormatterPart(parts, "day");
  const month = extractFormatterPart(parts, "month");
  const year = extractFormatterPart(parts, "year");

  if (!day || !month || !year) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  fallbackMessage = "Không có dữ liệu"
): string {
  if (!value) {
    return fallbackMessage;
  }

  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim())) {
    const [year, month, day] = value.trim().split("-");
    return `${day}/${month}/${year}`;
  }

  const parsedDate = resolveDateValue(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return typeof value === "string" ? value : fallbackMessage;
  }

  const formattedValue = formatDateFromParts(dateFormatter.formatToParts(parsedDate));
  return formattedValue || fallbackMessage;
}

export function formatDateTime(
  value: string | Date | null | undefined,
  fallbackMessage = "Không có dữ liệu"
): string {
  if (!value) {
    return fallbackMessage;
  }

  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim())) {
    return formatDate(value, fallbackMessage);
  }

  const parsedDate = resolveDateValue(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return typeof value === "string" ? value : fallbackMessage;
  }

  const parts = dateTimeFormatter.formatToParts(parsedDate);
  const datePart = formatDateFromParts(parts);
  const hour = extractFormatterPart(parts, "hour");
  const minute = extractFormatterPart(parts, "minute");

  if (!datePart || !hour || !minute) {
    return fallbackMessage;
  }

  return `${datePart} ${hour}:${minute}`;
}
