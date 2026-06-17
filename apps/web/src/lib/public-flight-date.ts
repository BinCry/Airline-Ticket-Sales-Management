import type { ApiFlightSearchCriteria } from "@qlvmb/shared-types";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function padNumber(value: string | number) {
  return String(value).padStart(2, "0");
}

function getVietnamDateParts(referenceDate: Date) {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(referenceDate);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

export function getVietnamTodayIso(referenceDate: Date = new Date()) {
  const { year, month, day } = getVietnamDateParts(referenceDate);
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate: string, daysToAdd: number) {
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return isoDate;
  }

  parsedDate.setUTCDate(parsedDate.getUTCDate() + daysToAdd);
  const year = parsedDate.getUTCFullYear();
  const month = padNumber(parsedDate.getUTCMonth() + 1);
  const day = padNumber(parsedDate.getUTCDate());
  return `${year}-${month}-${day}`;
}

export function resolveRoundTripReturnDate(
  departureDate: string,
  currentReturnDate: string | null | undefined
) {
  if (currentReturnDate && currentReturnDate >= departureDate) {
    return currentReturnDate;
  }

  return addDaysToIsoDate(departureDate, 3);
}

export function createDefaultFlightSearchCriteria(
  referenceDate: Date = new Date()
): ApiFlightSearchCriteria {
  const departureDate = getVietnamTodayIso(referenceDate);

  return {
    from: "SGN",
    to: "HAN",
    departureDate,
    returnDate: null,
    tripType: "one_way",
    adultCount: 1,
    childCount: 0,
    infantCount: 0
  };
}
