import type {
  ApiFlightBookingFareOption,
  ApiFlightBookingOptionsResponse,
  ApiFlightSearchCriteria,
  ApiFlightSearchResponse,
  ApiPaymentSessionResponse,
  FareFamily,
  PassengerType
} from "@qlvmb/shared-types";

import type { BookingHandoffState } from "@/lib/booking-flow";
import type { MyVoucher } from "@/lib/my-account-api";

export interface CopilotContactState {
  email: string;
  fullName: string;
  phone: string;
}

export interface CopilotPassengerState {
  dateOfBirth: string;
  documentNumber: string;
  documentType: string;
  fullName: string;
  passengerType: PassengerType;
}

export interface CopilotPassengerSegmentChoice {
  fareFamily: ApiFlightBookingFareOption["fareFamily"] | null;
  farePrice: number;
  fareTitle: string;
  inventoryId: number | null;
  seatNumber: string;
}

export interface CopilotSearchFlightsInput {
  adultCount?: number | null;
  childCount?: number | null;
  departureDate?: string | null;
  from?: string | null;
  infantCount?: number | null;
  returnDate?: string | null;
  to?: string | null;
  tripType?: ApiFlightSearchCriteria["tripType"] | null;
}

export interface CopilotPassengerDraft {
  dateOfBirth?: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  fullName?: string | null;
  passengerIndex?: number | null;
  preferredFareFamily?: FareFamily | null;
  preferredSeatNumber?: string | null;
  seatPreference?: string | null;
}

export interface CopilotFillPassengerInfoInput {
  autoChooseSeats?: boolean | null;
  contactEmail?: string | null;
  contactFullName?: string | null;
  contactPhone?: string | null;
  passengers?: CopilotPassengerDraft[] | null;
}

export interface CopilotAssignedSeat {
  fareFamily: FareFamily | null;
  passengerIndex: number;
  seatNumber: string;
  segmentIndex: number;
}

export interface ApplyCopilotPassengerInfoResult {
  assignedSeats: CopilotAssignedSeat[];
  nextContact: CopilotContactState;
  nextPassengers: CopilotPassengerState[];
  nextSegmentChoices: CopilotPassengerSegmentChoice[][];
  updatedPassengerIndexes: number[];
}

interface SeatCandidate {
  fareFamily: FareFamily;
  seatNumber: string;
}

interface SearchReadableFlight {
  arrivalTime: string;
  baseFare: number;
  code: string;
  departureTime: string;
  fareOptions: Array<{
    fareFamily: FareFamily;
    inventoryId: number;
    price: number;
    seatsLeft: number;
    title: string;
  }>;
  flightId: number;
  from: string;
  route: string;
  status: string;
  to: string;
  totalSeatsLeft: number;
}

const WINDOW_SEAT_LETTERS = new Set(["A", "F"]);
const AISLE_SEAT_LETTERS = new Set(["C", "D"]);
const KNOWN_FARE_FAMILIES: FareFamily[] = [
  "pho_thong_tiet_kiem",
  "pho_thong_linh_hoat",
  "thuong_gia"
];

function trimToNull(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeSeatNumber(value: string | null | undefined) {
  const trimmedValue = trimToNull(value);
  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue.toUpperCase();
  return /^[1-9][0-9]?[A-F]$/.test(normalizedValue) ? normalizedValue : null;
}

function normalizeAirportCode(
  value: string | null | undefined,
  fallbackValue: string
) {
  const trimmedValue = trimToNull(value);
  return trimmedValue ? trimmedValue.toUpperCase() : fallbackValue;
}

function normalizeTripType(
  value: ApiFlightSearchCriteria["tripType"] | null | undefined,
  fallbackValue: ApiFlightSearchCriteria["tripType"]
) {
  return value === "round_trip" || value === "one_way" ? value : fallbackValue;
}

function normalizePassengerCount(
  value: number | null | undefined,
  fallbackValue: number,
  minimumValue: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallbackValue;
  }

  const normalizedValue = Math.max(minimumValue, Math.trunc(value));
  return normalizedValue;
}

function normalizeLooseText(value: string | null | undefined) {
  const trimmedValue = trimToNull(value);
  if (!trimmedValue) {
    return "";
  }

  return trimmedValue
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase();
}

function normalizeFareFamily(
  value: FareFamily | string | null | undefined
): FareFamily | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim() as FareFamily;
  return KNOWN_FARE_FAMILIES.includes(normalizedValue) ? normalizedValue : null;
}

function parseSeatNumber(seatNumber: string) {
  const match = /^([1-9][0-9]?)([A-F])$/.exec(seatNumber);
  if (!match) {
    return null;
  }

  return {
    letter: match[2],
    row: Number.parseInt(match[1], 10)
  };
}

function resolveSeatScore(seatNumber: string, preference: string | null) {
  const parsedSeat = parseSeatNumber(seatNumber);
  if (!parsedSeat) {
    return Number.MAX_SAFE_INTEGER;
  }

  const baseRowScore = parsedSeat.row * 10;
  const baseLetterScore = parsedSeat.letter.charCodeAt(0);
  const normalizedPreference = normalizeLooseText(preference);

  if (!normalizedPreference) {
    return baseRowScore + baseLetterScore;
  }

  if (
    normalizedPreference.includes("cua so") ||
    normalizedPreference.includes("window")
  ) {
    return (WINDOW_SEAT_LETTERS.has(parsedSeat.letter) ? 0 : 1000) +
      baseRowScore +
      baseLetterScore;
  }

  if (
    normalizedPreference.includes("loi di") ||
    normalizedPreference.includes("aisle")
  ) {
    return (AISLE_SEAT_LETTERS.has(parsedSeat.letter) ? 0 : 1000) +
      baseRowScore +
      baseLetterScore;
  }

  if (
    normalizedPreference.includes("hang dau") ||
    normalizedPreference.includes("gan dau") ||
    normalizedPreference.includes("front")
  ) {
    return parsedSeat.row * 100 + baseLetterScore;
  }

  if (
    normalizedPreference.includes("hang cuoi") ||
    normalizedPreference.includes("cuoi may bay") ||
    normalizedPreference.includes("back")
  ) {
    return (100 - parsedSeat.row) * 100 + baseLetterScore;
  }

  return baseRowScore + baseLetterScore;
}

function createSearchReadableFlight(
  flight: ApiFlightSearchResponse["outboundFlights"][number]
): SearchReadableFlight {
  return {
    arrivalTime: flight.arrivalTime,
    baseFare: flight.baseFare,
    code: flight.code,
    departureTime: flight.departureTime,
    fareOptions: flight.fares.map((fareOption) => ({
      fareFamily: fareOption.fareFamily,
      inventoryId: fareOption.inventoryId,
      price: fareOption.price,
      seatsLeft: fareOption.seatsLeft,
      title: fareOption.title
    })),
    flightId: flight.flightId,
    from: flight.from,
    route: `${flight.from} -> ${flight.to}`,
    status: flight.status,
    to: flight.to,
    totalSeatsLeft: flight.fares.reduce(
      (seatCount, fareOption) => seatCount + fareOption.seatsLeft,
      0
    )
  };
}

function resolveTargetPassengerIndex(
  draft: CopilotPassengerDraft,
  passengers: CopilotPassengerState[],
  usedPassengerIndexes: Set<number>,
  fallbackIndex: number
) {
  if (
    typeof draft.passengerIndex === "number" &&
    Number.isInteger(draft.passengerIndex) &&
    draft.passengerIndex >= 0 &&
    draft.passengerIndex < passengers.length
  ) {
    return draft.passengerIndex;
  }

  for (let index = 0; index < passengers.length; index += 1) {
    if (usedPassengerIndexes.has(index)) {
      continue;
    }

    const passenger = passengers[index];
    if (!passenger.fullName || !passenger.documentNumber || !passenger.dateOfBirth) {
      return index;
    }
  }

  return Math.min(fallbackIndex, Math.max(passengers.length - 1, 0));
}

function resolvePreferredFareOption(
  segmentOptions: ApiFlightBookingOptionsResponse,
  currentChoice: CopilotPassengerSegmentChoice | undefined,
  preferredFareFamily: FareFamily | null,
  explicitSeatNumber: string | null
) {
  const explicitSeat = explicitSeatNumber
    ? segmentOptions.seats.find((seat) => seat.seatNumber === explicitSeatNumber)
    : null;
  const explicitSeatFare = explicitSeat
    ? segmentOptions.fareOptions.find(
        (fareOption) => fareOption.fareFamily === explicitSeat.fareFamily
      ) ?? null
    : null;

  if (explicitSeatFare) {
    return explicitSeatFare;
  }

  if (preferredFareFamily) {
    const preferredFareOption = segmentOptions.fareOptions.find(
      (fareOption) => fareOption.fareFamily === preferredFareFamily
    );
    if (preferredFareOption) {
      return preferredFareOption;
    }
  }

  if (currentChoice?.inventoryId !== null && currentChoice?.inventoryId !== undefined) {
    const currentFareOption = segmentOptions.fareOptions.find(
      (fareOption) => fareOption.inventoryId === currentChoice.inventoryId
    );
    if (currentFareOption) {
      return currentFareOption;
    }
  }

  return [...segmentOptions.fareOptions].sort(
    (firstFare, secondFare) => firstFare.price - secondFare.price
  )[0] ?? null;
}

function isSeatAssignable(
  segmentOptions: ApiFlightBookingOptionsResponse,
  segmentChoices: CopilotPassengerSegmentChoice[],
  passengerIndex: number,
  seatNumber: string,
  fareFamily: FareFamily
) {
  const seatMeta = segmentOptions.seats.find((seat) => seat.seatNumber === seatNumber);
  if (!seatMeta || seatMeta.fareFamily !== fareFamily || seatMeta.occupied) {
    return false;
  }

  return !segmentChoices.some(
    (choice, currentPassengerIndex) =>
      currentPassengerIndex !== passengerIndex && choice.seatNumber === seatNumber
  );
}

function assignSeatChoice(
  segmentChoices: CopilotPassengerSegmentChoice[],
  passengerIndex: number,
  fareOption: ApiFlightBookingOptionsResponse["fareOptions"][number],
  seatNumber: string
) {
  segmentChoices[passengerIndex] = {
    fareFamily: fareOption.fareFamily,
    farePrice: fareOption.price,
    fareTitle: fareOption.title,
    inventoryId: fareOption.inventoryId,
    seatNumber
  };
}

function resolveSeatCandidates(
  segmentOptions: ApiFlightBookingOptionsResponse,
  fareFamily: FareFamily
) {
  return segmentOptions.seats
    .filter((seat) => seat.fareFamily === fareFamily)
    .map<SeatCandidate>((seat) => ({
      fareFamily: seat.fareFamily,
      seatNumber: seat.seatNumber
    }));
}

function suggestSeatForPassenger(
  segmentOptions: ApiFlightBookingOptionsResponse,
  segmentChoices: CopilotPassengerSegmentChoice[],
  passengerIndex: number,
  fareOption: ApiFlightBookingOptionsResponse["fareOptions"][number],
  explicitSeatNumber: string | null,
  seatPreference: string | null
) {
  if (
    explicitSeatNumber &&
    isSeatAssignable(
      segmentOptions,
      segmentChoices,
      passengerIndex,
      explicitSeatNumber,
      fareOption.fareFamily
    )
  ) {
    return explicitSeatNumber;
  }

  return resolveSeatCandidates(segmentOptions, fareOption.fareFamily)
    .sort(
      (firstSeat, secondSeat) =>
        resolveSeatScore(firstSeat.seatNumber, seatPreference) -
        resolveSeatScore(secondSeat.seatNumber, seatPreference)
    )
    .find((candidateSeat) =>
      isSeatAssignable(
        segmentOptions,
        segmentChoices,
        passengerIndex,
        candidateSeat.seatNumber,
        fareOption.fareFamily
      )
    )?.seatNumber ?? null;
}

export function buildSearchCriteriaFromCopilotInput(
  currentCriteria: ApiFlightSearchCriteria,
  input: CopilotSearchFlightsInput
): ApiFlightSearchCriteria {
  const tripType = normalizeTripType(input.tripType, currentCriteria.tripType);
  const departureDate = trimToNull(input.departureDate) ?? currentCriteria.departureDate;
  const returnDate =
    tripType === "round_trip"
      ? trimToNull(input.returnDate) ?? currentCriteria.returnDate ?? departureDate
      : null;

  return {
    adultCount: normalizePassengerCount(input.adultCount, currentCriteria.adultCount, 1),
    childCount: normalizePassengerCount(input.childCount, currentCriteria.childCount, 0),
    departureDate,
    from: normalizeAirportCode(input.from, currentCriteria.from),
    infantCount: normalizePassengerCount(input.infantCount, currentCriteria.infantCount, 0),
    returnDate,
    to: normalizeAirportCode(input.to, currentCriteria.to),
    tripType
  };
}

export function createSearchReadableValue(
  criteria: ApiFlightSearchCriteria,
  searchData: ApiFlightSearchResponse | null,
  selectedOutboundFlightId: number | null
) {
  const outboundFlights = (searchData?.outboundFlights ?? []).map(createSearchReadableFlight);
  const returnFlights = (searchData?.returnFlights ?? []).map(createSearchReadableFlight);
  const selectedOutboundFlight =
    selectedOutboundFlightId === null
      ? null
      : outboundFlights.find((flight) => flight.flightId === selectedOutboundFlightId) ?? null;

  return {
    criteria,
    outboundFlights,
    resultScreen: "search_results",
    returnFlights,
    selectedOutboundFlight,
    totalOutboundFlights: outboundFlights.length,
    totalReturnFlights: returnFlights.length
  };
}

export function createBookingReadableValue(params: {
  activePassengerBySegment: number[];
  bookingOptions: ApiFlightBookingOptionsResponse[];
  contact: CopilotContactState;
  handoffState: BookingHandoffState | null;
  passengers: CopilotPassengerState[];
  segmentChoices: CopilotPassengerSegmentChoice[][];
}) {
  const {
    activePassengerBySegment,
    bookingOptions,
    contact,
    handoffState,
    passengers,
    segmentChoices
  } = params;

  return {
    contact,
    passengers: passengers.map((passenger, passengerIndex) => ({
      ...passenger,
      passengerIndex
    })),
    resultScreen: "booking_form",
    segments: (handoffState?.segments ?? []).map((segment, segmentIndex) => {
      const options = bookingOptions[segmentIndex];
      const choices = segmentChoices[segmentIndex] ?? [];

      return {
        activePassengerIndex: activePassengerBySegment[segmentIndex] ?? 0,
        code: segment.code,
        departureAt: segment.departureAt,
        fareOptions: (options?.fareOptions ?? []).map((fareOption) => ({
          fareFamily: fareOption.fareFamily,
          inventoryId: fareOption.inventoryId,
          price: fareOption.price,
          rowEnd: fareOption.rowEnd,
          rowStart: fareOption.rowStart,
          seatsLeft: fareOption.seatsLeft,
          title: fareOption.title
        })),
        flightId: segment.flightId,
        route: `${segment.from} -> ${segment.to}`,
        seatAssignments: choices.map((choice, passengerIndex) => ({
          fareFamily: choice.fareFamily,
          passengerIndex,
          passengerName:
            passengers[passengerIndex]?.fullName || `Hanh khach ${passengerIndex + 1}`,
          seatNumber: choice.seatNumber || null
        })),
        seatCatalog: (options?.seats ?? []).map((seat) => ({
          assignedPassengerIndex: choices.findIndex(
            (choice) => choice.seatNumber === seat.seatNumber
          ),
          fareFamily: seat.fareFamily,
          occupied: seat.occupied,
          seatNumber: seat.seatNumber
        })),
        segmentIndex
      };
    }),
    totalPassengers: passengers.length,
    tripType: handoffState?.tripType ?? null
  };
}

export function applyCopilotPassengerInfo(params: {
  bookingOptions: ApiFlightBookingOptionsResponse[];
  contact: CopilotContactState;
  input: CopilotFillPassengerInfoInput;
  passengers: CopilotPassengerState[];
  segmentChoices: CopilotPassengerSegmentChoice[][];
}): ApplyCopilotPassengerInfoResult {
  const { bookingOptions, contact, input, passengers, segmentChoices } = params;
  const nextContact: CopilotContactState = {
    email: trimToNull(input.contactEmail) ?? contact.email,
    fullName: trimToNull(input.contactFullName) ?? contact.fullName,
    phone: trimToNull(input.contactPhone) ?? contact.phone
  };
  const nextPassengers = passengers.map((passenger) => ({ ...passenger }));
  const nextSegmentChoices = segmentChoices.map((segmentChoiceList) =>
    segmentChoiceList.map((choice) => ({ ...choice }))
  );
  const assignedSeats: CopilotAssignedSeat[] = [];
  const updatedPassengerIndexes = new Set<number>();
  const usedPassengerIndexes = new Set<number>();
  const passengerDrafts = Array.isArray(input.passengers) ? input.passengers : [];
  const autoChooseSeats = input.autoChooseSeats === true;

  const normalizedDrafts = passengerDrafts.map((draft, fallbackIndex) => {
    const passengerIndex = resolveTargetPassengerIndex(
      draft,
      nextPassengers,
      usedPassengerIndexes,
      fallbackIndex
    );
    usedPassengerIndexes.add(passengerIndex);
    return {
      ...draft,
      passengerIndex
    };
  });

  normalizedDrafts.forEach((draft) => {
    const passenger = nextPassengers[draft.passengerIndex];
    if (!passenger) {
      return;
    }

    updatedPassengerIndexes.add(draft.passengerIndex);
    passenger.fullName = trimToNull(draft.fullName) ?? passenger.fullName;
    passenger.dateOfBirth = trimToNull(draft.dateOfBirth) ?? passenger.dateOfBirth;
    passenger.documentType = trimToNull(draft.documentType) ?? passenger.documentType;
    passenger.documentNumber =
      trimToNull(draft.documentNumber) ?? passenger.documentNumber;
  });

  bookingOptions.forEach((segmentOptions, segmentIndex) => {
    const currentSegmentChoices =
      nextSegmentChoices[segmentIndex] ??
      Array.from({ length: nextPassengers.length }, () => ({
        fareFamily: null,
        farePrice: 0,
        fareTitle: "",
        inventoryId: null,
        seatNumber: ""
      }));
    nextSegmentChoices[segmentIndex] = currentSegmentChoices;

    normalizedDrafts.forEach((draft) => {
      const explicitSeatNumber = normalizeSeatNumber(draft.preferredSeatNumber);
      const preferredFareFamily = normalizeFareFamily(draft.preferredFareFamily);
      const currentChoice = currentSegmentChoices[draft.passengerIndex];
      const fareOption = resolvePreferredFareOption(
        segmentOptions,
        currentChoice,
        preferredFareFamily,
        explicitSeatNumber
      );

      if (!fareOption) {
        return;
      }

      const needsSeatSelection =
        explicitSeatNumber !== null ||
        autoChooseSeats ||
        trimToNull(draft.seatPreference) !== null ||
        !currentChoice?.seatNumber;
      const nextSeatNumber = needsSeatSelection
        ? suggestSeatForPassenger(
            segmentOptions,
            currentSegmentChoices,
            draft.passengerIndex,
            fareOption,
            explicitSeatNumber,
            trimToNull(draft.seatPreference)
          )
        : currentChoice?.seatNumber ?? null;

      assignSeatChoice(
        currentSegmentChoices,
        draft.passengerIndex,
        fareOption,
        nextSeatNumber ?? ""
      );

      if (nextSeatNumber) {
        assignedSeats.push({
          fareFamily: fareOption.fareFamily,
          passengerIndex: draft.passengerIndex,
          seatNumber: nextSeatNumber,
          segmentIndex
        });
      }
    });

    if (!autoChooseSeats) {
      return;
    }

    currentSegmentChoices.forEach((choice, passengerIndex) => {
      if (choice.seatNumber) {
        return;
      }

      const fareOption = resolvePreferredFareOption(
        segmentOptions,
        choice,
        choice.fareFamily,
        null
      );
      if (!fareOption) {
        return;
      }

      const nextSeatNumber = suggestSeatForPassenger(
        segmentOptions,
        currentSegmentChoices,
        passengerIndex,
        fareOption,
        null,
        null
      );

      if (!nextSeatNumber) {
        return;
      }

      assignSeatChoice(currentSegmentChoices, passengerIndex, fareOption, nextSeatNumber);
      assignedSeats.push({
        fareFamily: fareOption.fareFamily,
        passengerIndex,
        seatNumber: nextSeatNumber,
        segmentIndex
      });
    });
  });

  return {
    assignedSeats,
    nextContact,
    nextPassengers,
    nextSegmentChoices,
    updatedPassengerIndexes: [...updatedPassengerIndexes].sort((left, right) => left - right)
  };
}

export function createCheckoutReadableValue(params: {
  availableVouchers: MyVoucher[];
  bookingCode: string;
  isMemberSession: boolean;
  isPaymentClosed: boolean;
  session: ApiPaymentSessionResponse | null;
}) {
  const { availableVouchers, bookingCode, isMemberSession, isPaymentClosed, session } =
    params;

  return {
    availableVouchers: availableVouchers.map((voucher) => ({
      bookingCode: voucher.bookingCode,
      description: voucher.description,
      discountAmount: voucher.discountAmount,
      expiresAt: voucher.expiresAt,
      status: voucher.status,
      title: voucher.title,
      voucherCode: voucher.voucherCode
    })),
    bookingCode,
    isMemberSession,
    isPaymentClosed,
    paymentSession: session
      ? {
          accountHolderName: session.accountHolderName,
          accountNumber: session.accountNumber,
          amount: session.amount,
          appliedVoucherCode: session.appliedVoucherCode,
          bankName: session.bankName,
          bookingCode: session.bookingCode,
          discountAmount: session.discountAmount,
          expiresAt: session.expiresAt,
          paymentStatus: session.paymentStatus,
          provider: session.provider,
          qrCodeDataUrl: session.qrCodeDataUrl,
          qrCodeUrl: session.qrCodeUrl,
          referenceCode: session.referenceCode,
          sessionMode: session.sessionMode
        }
      : null,
    resultScreen: "booking_checkout"
  };
}
