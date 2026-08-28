import type {
  ApiCreateBookingHoldRequest,
  ApiFlightCard,
  ApiFlightSearchCriteria,
  PassengerType
} from "@qlvmb/shared-types";

export interface BookingHandoffSegment {
  arrivalAt: string;
  arrivalTime: string;
  baseFare: number;
  code: string;
  departureAt: string;
  departureTime: string;
  destinationCode: string;
  flightId: number;
  from: string;
  originCode: string;
  to: string;
}

export interface BookingHandoffState {
  adultCount: number;
  childCount: number;
  infantCount: number;
  segments: BookingHandoffSegment[];
  tripType: ApiCreateBookingHoldRequest["tripType"];
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

export function validatePassengerAge(
  passengerType: PassengerType,
  dateOfBirth: string,
  departureAt: string
): string | null {
  if (!dateOfBirth || !departureAt) {
    return null;
  }

  const birthDate = parseIsoDate(dateOfBirth);
  const departureDate = parseIsoDate(departureAt.slice(0, 10));
  if (!birthDate || !departureDate) {
    return null;
  }

  const ageAtDeparture = departureDate.getUTCFullYear() - birthDate.getUTCFullYear() - (
    departureDate.getUTCMonth() < birthDate.getUTCMonth() ||
    (departureDate.getUTCMonth() === birthDate.getUTCMonth() &&
      departureDate.getUTCDate() < birthDate.getUTCDate())
      ? 1
      : 0
  );

  const matchesPassengerType =
    birthDate <= departureDate &&
    ((passengerType === "adult" && ageAtDeparture >= 12) ||
      (passengerType === "child" && ageAtDeparture >= 2 && ageAtDeparture < 12) ||
      (passengerType === "infant" && ageAtDeparture < 2));

  if (matchesPassengerType) {
    return null;
  }

  switch (passengerType) {
    case "adult":
      return "Hành khách người lớn phải từ đủ 12 tuổi tại ngày khởi hành đầu tiên.";
    case "child":
      return "Hành khách trẻ em phải từ 2 đến dưới 12 tuổi tại ngày khởi hành đầu tiên.";
    case "infant":
      return "Hành khách em bé phải dưới 2 tuổi tại ngày khởi hành đầu tiên.";
    default:
      return "Loại hành khách không hợp lệ.";
  }
}

function readPositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function readSegment(searchParams: URLSearchParams, index: number): BookingHandoffSegment | null {
  const prefix = `segment${index}`;
  const flightId = readPositiveInteger(searchParams.get(`${prefix}FlightId`));
  const code = searchParams.get(`${prefix}Code`);
  const from = searchParams.get(`${prefix}From`);
  const to = searchParams.get(`${prefix}To`);
  const originCode = searchParams.get(`${prefix}OriginCode`);
  const destinationCode = searchParams.get(`${prefix}DestinationCode`);
  const departureAt = searchParams.get(`${prefix}DepartureAt`);
  const arrivalAt = searchParams.get(`${prefix}ArrivalAt`);
  const departureTime = searchParams.get(`${prefix}DepartureTime`);
  const arrivalTime = searchParams.get(`${prefix}ArrivalTime`);
  const baseFare = readPositiveInteger(searchParams.get(`${prefix}BaseFare`));

  if (
    flightId === null ||
    !code ||
    !from ||
    !to ||
    !originCode ||
    !destinationCode ||
    !departureAt ||
    !arrivalAt ||
    !departureTime ||
    !arrivalTime ||
    baseFare === null
  ) {
    return null;
  }

  return {
    arrivalAt,
    arrivalTime,
    baseFare,
    code,
    departureAt,
    departureTime,
    destinationCode,
    flightId,
    from,
    originCode,
    to
  };
}

export function createBookingHandoffUrl(
  criteria: ApiFlightSearchCriteria,
  segments: BookingHandoffSegment[]
): string {
  const searchParams = new URLSearchParams({
    adultCount: String(criteria.adultCount),
    childCount: String(criteria.childCount),
    infantCount: String(criteria.infantCount),
    tripType: criteria.tripType
  });

  segments.forEach((segment, index) => {
    const segmentNumber = index + 1;
    searchParams.set(`segment${segmentNumber}FlightId`, String(segment.flightId));
    searchParams.set(`segment${segmentNumber}Code`, segment.code);
    searchParams.set(`segment${segmentNumber}From`, segment.from);
    searchParams.set(`segment${segmentNumber}To`, segment.to);
    searchParams.set(`segment${segmentNumber}OriginCode`, segment.originCode);
    searchParams.set(`segment${segmentNumber}DestinationCode`, segment.destinationCode);
    searchParams.set(`segment${segmentNumber}DepartureAt`, segment.departureAt);
    searchParams.set(`segment${segmentNumber}ArrivalAt`, segment.arrivalAt);
    searchParams.set(`segment${segmentNumber}DepartureTime`, segment.departureTime);
    searchParams.set(`segment${segmentNumber}ArrivalTime`, segment.arrivalTime);
    searchParams.set(`segment${segmentNumber}BaseFare`, String(segment.baseFare));
  });

  return `/booking?${searchParams.toString()}`;
}

export function createHandoffSegmentFromFlight(flight: ApiFlightCard): BookingHandoffSegment {
  return {
    arrivalAt: flight.arrivalAt,
    arrivalTime: flight.arrivalTime,
    baseFare: flight.baseFare,
    code: flight.code,
    departureAt: flight.departureAt,
    departureTime: flight.departureTime,
    destinationCode: flight.destinationCode,
    flightId: flight.flightId,
    from: flight.from,
    originCode: flight.originCode,
    to: flight.to
  };
}

export function parseBookingHandoffState(searchParams: URLSearchParams): BookingHandoffState | null {
  const tripType = searchParams.get("tripType");
  if (tripType !== "one_way" && tripType !== "round_trip") {
    return null;
  }

  const adultCount = readPositiveInteger(searchParams.get("adultCount"));
  const childCount = readPositiveInteger(searchParams.get("childCount"));
  const infantCount = readPositiveInteger(searchParams.get("infantCount"));

  if (adultCount === null || childCount === null || infantCount === null || adultCount < 1) {
    return null;
  }

  const firstSegment = readSegment(searchParams, 1);
  const secondSegment = readSegment(searchParams, 2);
  const segments = [firstSegment, secondSegment].filter(
    (segment): segment is BookingHandoffSegment => segment !== null
  );

  if (tripType === "one_way" && segments.length !== 1) {
    return null;
  }

  if (tripType === "round_trip" && segments.length !== 2) {
    return null;
  }

  return {
    adultCount,
    childCount,
    infantCount,
    segments,
    tripType
  };
}
