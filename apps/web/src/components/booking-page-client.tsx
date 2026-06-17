"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type {
  ApiBookingPassengerInput,
  ApiCreateBookingHoldRequest,
  ApiFlightBookingFareOption,
  ApiFlightBookingOptionsResponse,
  PassengerType
} from "@qlvmb/shared-types";

import { DateField } from "@/components/date-field";
import { SectionHeading } from "@/components/section-heading";
import { canAccessBackofficeModule } from "@/lib/access-control";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import {
  BACKOFFICE_SALES_FLOW_QUERY_KEY,
  appendBackofficeSalesFlow,
  createBackofficeSalesLookupHref,
  isBackofficeSalesFlowValue
} from "@/lib/backoffice-sales-flow";
import { loadActiveAuthSession, type AuthSession } from "@/lib/auth-session";
import { createBookingHold, fetchFlightBookingOptions } from "@/lib/booking-api";
import { parseBookingHandoffState } from "@/lib/booking-flow";
import { layLopMauGoiGia } from "@/lib/display";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { pushToast } from "@/lib/toast";

interface ContactFormState {
  email: string;
  fullName: string;
  phone: string;
}

interface PassengerFormState {
  dateOfBirth: string;
  documentNumber: string;
  documentType: string;
  fullName: string;
  passengerType: PassengerType;
}

interface PassengerSegmentChoice {
  fareFamily: ApiFlightBookingFareOption["fareFamily"] | null;
  farePrice: number;
  fareTitle: string;
  inventoryId: number | null;
  seatNumber: string;
}

type SubmitAction = "checkout" | "backoffice_sales";

const seatRows = Array.from({ length: 28 }, (_, index) => index + 1);
const seatLetters = ["A", "B", "C", "D", "E", "F"];

function buildPassengerForms(
  adultCount: number,
  childCount: number,
  infantCount: number
): PassengerFormState[] {
  const passengers: PassengerFormState[] = [];

  const buildGroup = (count: number, passengerType: PassengerType) => {
    for (let index = 0; index < count; index += 1) {
      passengers.push({
        dateOfBirth: "",
        documentNumber: "",
        documentType: passengerType === "infant" ? "Giấy khai sinh" : "CCCD",
        fullName: "",
        passengerType
      });
    }
  };

  buildGroup(adultCount, "adult");
  buildGroup(childCount, "child");
  buildGroup(infantCount, "infant");

  return passengers;
}

function formatPassengerType(passengerType: PassengerType) {
  switch (passengerType) {
    case "adult":
      return "Người lớn";
    case "child":
      return "Trẻ em";
    case "infant":
      return "Em bé";
    default:
      return passengerType;
  }
}

function hydrateContactFromSession(
  currentContact: ContactFormState,
  authSession: AuthSession
): ContactFormState {
  return {
    fullName: currentContact.fullName || authSession.user.displayName,
    email: currentContact.email || authSession.user.email,
    phone: currentContact.phone || authSession.user.phone || ""
  };
}

function createEmptyPassengerChoice(): PassengerSegmentChoice {
  return {
    fareFamily: null,
    farePrice: 0,
    fareTitle: "",
    inventoryId: null,
    seatNumber: ""
  };
}

function taoLuaChonMacDinh(
  fareOptions: ApiFlightBookingOptionsResponse["fareOptions"]
): PassengerSegmentChoice {
  const fareMacDinh = [...fareOptions].sort((firstFare, secondFare) => firstFare.price - secondFare.price)[0];

  if (!fareMacDinh) {
    return createEmptyPassengerChoice();
  }

  return {
    fareFamily: fareMacDinh.fareFamily,
    farePrice: fareMacDinh.price,
    fareTitle: fareMacDinh.title,
    inventoryId: fareMacDinh.inventoryId,
    seatNumber: ""
  };
}

function createDefaultChoices(
  bookingOptions: ApiFlightBookingOptionsResponse[],
  passengerCount: number
): PassengerSegmentChoice[][] {
  return bookingOptions.map((segmentOptions) => {
    const luaChonMacDinh = taoLuaChonMacDinh(segmentOptions.fareOptions);
    return Array.from({ length: passengerCount }, () => ({ ...luaChonMacDinh }));
  });
}

function tinhTongTienTamTinh(segmentChoices: PassengerSegmentChoice[][]): number {
  return segmentChoices.flat().reduce((tongTien, choice) => tongTien + choice.farePrice, 0);
}

function findFareOption(
  segmentOptions: ApiFlightBookingOptionsResponse | undefined,
  inventoryId: number | null
) {
  if (!segmentOptions || inventoryId === null) {
    return null;
  }

  return segmentOptions.fareOptions.find((fareOption) => fareOption.inventoryId === inventoryId) ?? null;
}

function tinhTongGheCon(segmentOptions: ApiFlightBookingOptionsResponse | undefined): number {
  if (!segmentOptions) {
    return 0;
  }

  return segmentOptions.fareOptions.reduce((tongGhe, fareOption) => tongGhe + fareOption.seatsLeft, 0);
}

export function BookingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handoffState = useMemo(
    () => parseBookingHandoffState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const isBackofficeSalesFlow = useMemo(
    () => isBackofficeSalesFlowValue(searchParams.get(BACKOFFICE_SALES_FLOW_QUERY_KEY)),
    [searchParams]
  );

  const [contact, setContact] = useState<ContactFormState>({
    email: "",
    fullName: "",
    phone: ""
  });
  const [passengers, setPassengers] = useState<PassengerFormState[]>(() =>
    handoffState
      ? buildPassengerForms(handoffState.adultCount, handoffState.childCount, handoffState.infantCount)
      : []
  );
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [hasBackofficeSalesAccess, setHasBackofficeSalesAccess] = useState(false);
  const [pendingSubmitAction, setPendingSubmitAction] = useState<SubmitAction | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingOptions, setBookingOptions] = useState<ApiFlightBookingOptionsResponse[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [segmentChoices, setSegmentChoices] = useState<PassengerSegmentChoice[][]>([]);
  const [activePassengerBySegment, setActivePassengerBySegment] = useState<number[]>([]);

  useEffect(() => {
    const storedSession = loadActiveAuthSession();
    setAccessToken(storedSession?.accessToken);
    setHasBackofficeSalesAccess(
      storedSession ? canAccessBackofficeModule(storedSession.user.permissions, "sales") : false
    );

    if (!storedSession) {
      return;
    }

    setContact((currentContact) => hydrateContactFromSession(currentContact, storedSession));
  }, []);

  useEffect(() => {
    if (!handoffState) {
      setPassengers([]);
      setBookingOptions([]);
      setSegmentChoices([]);
      setActivePassengerBySegment([]);
      return;
    }

    setPassengers(
      buildPassengerForms(
        handoffState.adultCount,
        handoffState.childCount,
        handoffState.infantCount
      )
    );
  }, [handoffState]);

  useEffect(() => {
    if (!handoffState) {
      return;
    }

    const currentHandoffState = handoffState;
    let cancelled = false;

    async function loadBookingOptions() {
      setIsLoadingOptions(true);
      setOptionsError(null);

      try {
        const nextOptions = await Promise.all(
          currentHandoffState.segments.map((segment) => fetchFlightBookingOptions(segment.flightId))
        );

        if (cancelled) {
          return;
        }

        setBookingOptions(nextOptions);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBookingOptions([]);
        setSegmentChoices([]);
        setActivePassengerBySegment([]);
        setOptionsError(resolveApiClientErrorMessage(error, "Không thể tải lựa chọn hạng vé và ghế lúc này."));
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadBookingOptions();

    return () => {
      cancelled = true;
    };
  }, [handoffState]);

  useEffect(() => {
    if (bookingOptions.length === 0 || passengers.length === 0) {
      setSegmentChoices([]);
      setActivePassengerBySegment([]);
      return;
    }

    setSegmentChoices(createDefaultChoices(bookingOptions, passengers.length));
    setActivePassengerBySegment(Array.from({ length: bookingOptions.length }, () => 0));
  }, [bookingOptions, passengers.length]);

  if (!handoffState) {
    const fallbackSearchHref = isBackofficeSalesFlow ? appendBackofficeSalesFlow("/search") : "/search";

    return (
      <section className="section">
        <div className="container">
          <article className="surface-card booking-empty-card">
            <span className="section-eyebrow">Không tìm thấy dữ liệu</span>
            <h1 className="page-title">Không tìm thấy chuyến bay đã chọn</h1>
            <p>Hãy quay lại trang tìm chuyến bay và chọn lại hành trình trước khi nhập thông tin hành khách.</p>
            <Link href={fallbackSearchHref} className="button button-primary">
              Quay lại tìm chuyến bay
            </Link>
          </article>
        </div>
      </section>
    );
  }

  const totalPassengerCount = passengers.length;
  const totalAmount = tinhTongTienTamTinh(segmentChoices);
  const canConfirmBackofficeSales = isBackofficeSalesFlow && hasBackofficeSalesAccess;

  function updatePassenger<FieldName extends keyof PassengerFormState>(
    passengerIndex: number,
    fieldName: FieldName,
    fieldValue: PassengerFormState[FieldName]
  ) {
    setPassengers((currentPassengers) =>
      currentPassengers.map((passenger, index) =>
        index === passengerIndex
          ? {
              ...passenger,
              [fieldName]: fieldValue
            }
          : passenger
      )
    );
  }

  function chonHanhKhachChoSegment(segmentIndex: number, passengerIndex: number) {
    setActivePassengerBySegment((currentValues) =>
      currentValues.map((value, index) => (index === segmentIndex ? passengerIndex : value))
    );
  }

  function chonHangVeChoHanhKhach(
    segmentIndex: number,
    passengerIndex: number,
    fareOption: ApiFlightBookingFareOption
  ) {
    setSegmentChoices((currentChoices) =>
      currentChoices.map((segmentChoiceList, currentSegmentIndex) => {
        if (currentSegmentIndex !== segmentIndex) {
          return segmentChoiceList;
        }

        return segmentChoiceList.map((choice, currentPassengerIndex) =>
          currentPassengerIndex === passengerIndex
            ? {
                fareFamily: fareOption.fareFamily,
                farePrice: fareOption.price,
                fareTitle: fareOption.title,
                inventoryId: fareOption.inventoryId,
                seatNumber: ""
              }
            : choice
        );
      })
    );
  }

  function chonGheChoHanhKhach(segmentIndex: number, passengerIndex: number, seatNumber: string) {
    setSegmentChoices((currentChoices) =>
      currentChoices.map((segmentChoiceList, currentSegmentIndex) => {
        if (currentSegmentIndex !== segmentIndex) {
          return segmentChoiceList;
        }

        return segmentChoiceList.map((choice, currentPassengerIndex) =>
          currentPassengerIndex === passengerIndex
            ? {
                ...choice,
                seatNumber: choice.seatNumber === seatNumber ? "" : seatNumber
              }
            : choice
        );
      })
    );
  }

  async function taoBookingHoldVaDieuHuong(destination: SubmitAction) {
    if (pendingSubmitAction !== null || !handoffState) {
      return;
    }

    const currentHandoffState = handoffState;

    if (bookingOptions.length !== currentHandoffState.segments.length) {
      setSubmitError("Hệ thống chưa tải xong lựa chọn hạng vé và sơ đồ ghế cho toàn bộ chặng bay.");
      return;
    }

    const hasMissingChoice = segmentChoices.some((segmentChoiceList) =>
      segmentChoiceList.some(
        (choice) => choice.inventoryId === null || !choice.fareFamily || !choice.seatNumber
      )
    );

    if (hasMissingChoice) {
      setSubmitError("Hãy chọn đầy đủ hạng vé và ghế cho tất cả hành khách ở từng chặng trước khi giữ chỗ.");
      return;
    }

    setPendingSubmitAction(destination);
    setSubmitError(null);

    try {
      const payload: ApiCreateBookingHoldRequest = {
        ancillaries: [],
        contact: {
          email: contact.email.trim(),
          fullName: contact.fullName.trim(),
          phone: contact.phone.trim()
        },
        passengers: passengers.map<ApiBookingPassengerInput>((passenger) => ({
          dateOfBirth: passenger.dateOfBirth,
          documentNumber: passenger.documentNumber.trim(),
          documentType: passenger.documentType.trim(),
          fullName: passenger.fullName.trim(),
          passengerType: passenger.passengerType
        })),
        seatSelections: segmentChoices.flatMap((segmentChoiceList, segmentIndex) =>
          segmentChoiceList.map((choice, passengerIndex) => ({
            inventoryId: choice.inventoryId as number,
            passengerIndex,
            seatNumber: choice.seatNumber,
            segmentIndex
          }))
        ),
        segments: currentHandoffState.segments.map((segment) => ({
          flightId: segment.flightId
        })),
        tripType: currentHandoffState.tripType
      };

      const response = await createBookingHold(payload, accessToken);

      if (destination === "backoffice_sales") {
        pushToast({
          title: "Đã tạo booking hộ",
          message: `Booking ${response.bookingCode} đã được tạo và đang mở tại tab bán vé nội bộ.`,
          tone: "success"
        });
        router.push(createBackofficeSalesLookupHref(response.bookingCode, payload.contact.email));
        return;
      }

      router.push(`/booking/${response.bookingCode}/checkout`);
    } catch (error) {
      setSubmitError(resolveApiClientErrorMessage(error, "Không thể giữ chỗ lúc này."));
    } finally {
      setPendingSubmitAction(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await taoBookingHoldVaDieuHuong("checkout");
  }

  async function handleConfirmBackofficeSales() {
    await taoBookingHoldVaDieuHuong("backoffice_sales");
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card booking-flow-hero">
          <div>
            <span className="section-eyebrow">Đặt vé</span>
            <h1 className="page-title">Chọn hạng vé và ghế theo từng hành khách trước khi giữ chỗ.</h1>
            <p className="page-hero-copy">
              Kiểm tra hành trình, nhập thông tin hành khách, chọn hạng vé phù hợp cho từng người và chốt ghế riêng ở từng chặng trước khi thanh toán.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Giữ chỗ trong 15 phút</span>
            <h3>{handoffState.tripType === "round_trip" ? "Hành trình khứ hồi" : "Hành trình một chiều"}</h3>
            <p>{totalPassengerCount} hành khách • Tạm tính theo hạng vé đã chọn ở từng chặng.</p>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </div>

        <div className="section-gap" />
        <div className="section-split booking-flow-layout">
          <div className="stack-list">
            <SectionHeading
              eyebrow="Chuyến bay đã chọn"
              title="Tóm tắt hành trình"
              description="Kiểm tra lại chặng bay, giờ khởi hành và giá mở đầu trước khi nhập thông tin hành khách."
            />
            <div className="stack-list">
              {handoffState.segments.map((segment, index) => {
                const segmentOptions = bookingOptions[index];

                return (
                  <article key={`${segment.flightId}-${segment.code}`} className="surface-card booking-segment-card">
                    <div className="result-top">
                      <div>
                        <span className="section-eyebrow">
                          {handoffState.tripType === "round_trip"
                            ? index === 0
                              ? "Chiều đi"
                              : "Chiều về"
                            : "Chặng bay"}
                        </span>
                        <h3>{segment.code}</h3>
                        <p>{segment.from} - {segment.to}</p>
                      </div>
                      <span className="pill">Giá mở đầu {formatCurrency(segment.baseFare)}</span>
                    </div>
                    <div className="result-grid result-grid-rich">
                      <div>
                        <span>Khởi hành</span>
                        <strong>{formatDateTime(segment.departureAt)}</strong>
                      </div>
                      <div>
                        <span>Hạ cánh</span>
                        <strong>{formatDateTime(segment.arrivalAt)}</strong>
                      </div>
                      <div>
                        <span>Tổng ghế còn bán</span>
                        <strong>{segmentOptions ? `${tinhTongGheCon(segmentOptions)} ghế` : "Đang tải"}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="stack-list booking-form-wrap">
            <SectionHeading
              eyebrow="Thông tin giữ chỗ"
              title="Người liên hệ và hành khách"
              description="Điền đúng họ tên, giấy tờ và ngày sinh để tránh phát sinh lỗi ở bước xuất vé."
            />

            {isLoadingOptions ? (
              <article className="surface-card booking-inline-info">
                <strong>Đang tải lựa chọn hạng vé</strong>
                <p>Hệ thống đang đồng bộ sơ đồ ghế và mức giá của từng chặng bay.</p>
              </article>
            ) : null}

            {optionsError ? (
              <article className="surface-card booking-inline-error">
                <strong>Không thể tải lựa chọn chuyến bay</strong>
                <p>{optionsError}</p>
              </article>
            ) : null}

            <form className="surface-card booking-form-card" onSubmit={handleSubmit}>
              <div className="stack-list">
                <div className="booking-form-section">
                  <h3>Người liên hệ</h3>
                  <div className="field-grid">
                    <label className="field">
                      <span>Họ và tên</span>
                      <input
                        required
                        value={contact.fullName}
                        onChange={(event) =>
                          setContact((currentContact) => ({
                            ...currentContact,
                            fullName: event.target.value
                          }))
                        }
                        placeholder="Nguyễn Văn A"
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        required
                        type="email"
                        value={contact.email}
                        onChange={(event) =>
                          setContact((currentContact) => ({
                            ...currentContact,
                            email: event.target.value
                          }))
                        }
                        placeholder="tenban@gmail.com"
                      />
                    </label>
                    <label className="field">
                      <span>Số điện thoại</span>
                      <input
                        required
                        value={contact.phone}
                        onChange={(event) =>
                          setContact((currentContact) => ({
                            ...currentContact,
                            phone: event.target.value
                          }))
                        }
                        placeholder="0912345678"
                      />
                    </label>
                  </div>
                </div>

                <div className="booking-form-section">
                  <h3>Danh sách hành khách</h3>
                  <div className="stack-list">
                    {passengers.map((passenger, index) => (
                      <article key={`${passenger.passengerType}-${index}`} className="surface-card booking-passenger-card">
                        <div className="result-top">
                          <div>
                            <span className="section-eyebrow">Hành khách {index + 1}</span>
                            <h3>{formatPassengerType(passenger.passengerType)}</h3>
                          </div>
                          <span className="pill">{passenger.documentType}</span>
                        </div>
                        <div className="field-grid">
                          <label className="field">
                            <span>Họ và tên</span>
                            <input
                              required
                              value={passenger.fullName}
                              onChange={(event) => updatePassenger(index, "fullName", event.target.value)}
                              placeholder="Nhập đúng theo giấy tờ"
                            />
                          </label>
                          <label className="field">
                            <span>Ngày sinh</span>
                            <DateField
                              required
                              max={new Date().toISOString().slice(0, 10)}
                              value={passenger.dateOfBirth}
                              onChange={(value) => updatePassenger(index, "dateOfBirth", value)}
                            />
                          </label>
                          <label className="field">
                            <span>Loại giấy tờ</span>
                            <select
                              value={passenger.documentType}
                              onChange={(event) => updatePassenger(index, "documentType", event.target.value)}
                            >
                              <option value="CCCD">CCCD</option>
                              <option value="Hộ chiếu">Hộ chiếu</option>
                              <option value="Giấy khai sinh">Giấy khai sinh</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Số giấy tờ</span>
                            <input
                              required
                              value={passenger.documentNumber}
                              onChange={(event) => updatePassenger(index, "documentNumber", event.target.value)}
                              placeholder="Nhập số giấy tờ"
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {bookingOptions.map((segmentOptions, segmentIndex) => {
                  const activePassengerIndex = activePassengerBySegment[segmentIndex] ?? 0;
                  const activePassenger = passengers[activePassengerIndex];
                  const activeChoice = segmentChoices[segmentIndex]?.[activePassengerIndex] ?? createEmptyPassengerChoice();
                  const activeFareOption = findFareOption(segmentOptions, activeChoice.inventoryId);
                  const localTakenSeats = new Set(
                    (segmentChoices[segmentIndex] ?? [])
                      .map((choice, passengerIndex) =>
                        passengerIndex !== activePassengerIndex ? choice.seatNumber : ""
                      )
                      .filter(Boolean)
                  );
                  const occupiedSeats = new Set(
                    segmentOptions.seats
                      .filter((seat) => seat.occupied)
                      .map((seat) => seat.seatNumber)
                  );

                  return (
                    <div key={segmentOptions.flightId} className="booking-form-section">
                      <div className="booking-seat-head">
                        <div>
                          <h3>
                            {handoffState.tripType === "round_trip"
                              ? segmentIndex === 0
                                ? "Chọn hạng vé và ghế cho chiều đi"
                                : "Chọn hạng vé và ghế cho chiều về"
                              : "Chọn hạng vé và ghế"}
                          </h3>
                          <p>
                            Mỗi hành khách phải chọn riêng hạng vé và ghế cho chặng này. Chọn ghế không làm tăng giá, giá chỉ thay đổi theo hạng vé.
                          </p>
                        </div>
                        <strong>{segmentOptions.code}</strong>
                      </div>

                      <div className="filter-chip-list">
                        {passengers.map((passenger, passengerIndex) => {
                          const currentChoice = segmentChoices[segmentIndex]?.[passengerIndex];
                          const nhanGhe = currentChoice?.seatNumber ? ` • Ghế ${currentChoice.seatNumber}` : "";

                          return (
                            <button
                              key={`${segmentOptions.flightId}-${passengerIndex}`}
                              type="button"
                              className={
                                activePassengerIndex === passengerIndex
                                  ? "assurance-chip filter-chip-button active"
                                  : "assurance-chip filter-chip-button"
                              }
                              onClick={() => chonHanhKhachChoSegment(segmentIndex, passengerIndex)}
                            >
                              {`${passenger.fullName || `Hành khách ${passengerIndex + 1}`} • ${formatPassengerType(passenger.passengerType)}${nhanGhe}`}
                            </button>
                          );
                        })}
                      </div>

                      <div className="field-grid booking-fare-grid">
                        {segmentOptions.fareOptions.map((fareOption) => {
                          const isActive = activeChoice.inventoryId === fareOption.inventoryId;
                          return (
                            <button
                              key={fareOption.inventoryId}
                              type="button"
                              className={
                                isActive
                                  ? `surface-card result-card is-selected ${layLopMauGoiGia(fareOption.fareFamily)}`
                                  : `surface-card result-card ${layLopMauGoiGia(fareOption.fareFamily)}`
                              }
                              onClick={() => chonHangVeChoHanhKhach(segmentIndex, activePassengerIndex, fareOption)}
                            >
                              <div className="result-top">
                                <div>
                                  <span className="section-eyebrow">Hạng vé</span>
                                  <h3>{fareOption.title}</h3>
                                </div>
                                <span className="pill">{fareOption.seatsLeft} ghế còn</span>
                              </div>
                              <div className="result-grid result-grid-rich">
                                <div>
                                  <span>Giá vé</span>
                                  <strong>{formatCurrency(fareOption.price)}</strong>
                                </div>
                                <div>
                                  <span>Vùng ghế</span>
                                  <strong>Hàng {fareOption.rowStart}-{fareOption.rowEnd}</strong>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div
                        className={`seat-map-card ${layLopMauGoiGia(activeChoice.fareFamily ?? "")}`}
                        aria-label={`Sơ đồ chỗ ngồi cho ${segmentOptions.code}`}
                      >
                        <div className="seat-map-airframe" aria-hidden="true">
                          <div className="seat-map-tail" />
                        </div>
                        <div className="seat-map-nose" aria-hidden="true">Mũi máy bay</div>
                        <div className="seat-map-wing seat-map-wing-left" aria-hidden="true" />
                        <div className="seat-map-wing seat-map-wing-right" aria-hidden="true" />
                        <div className="seat-map-cabin">
                          {seatRows.map((row) => (
                            <div key={`${segmentOptions.flightId}-${row}`} className="seat-map-row">
                              <span className="seat-row-number">{row}</span>
                              {seatLetters.map((letter, index) => {
                                const seatNumber = `${row}${letter}`;
                                const seatMeta = segmentOptions.seats.find((seat) => seat.seatNumber === seatNumber);
                                const isSelected = activeChoice.seatNumber === seatNumber;
                                const isTakenByOtherPassenger = localTakenSeats.has(seatNumber);
                                const isOccupied = occupiedSeats.has(seatNumber);
                                const isAllowedSeat = seatMeta
                                  ? seatMeta.fareFamily === activeChoice.fareFamily
                                  : activeFareOption
                                    ? row >= activeFareOption.rowStart && row <= activeFareOption.rowEnd
                                    : false;
                                const isUnavailable = !isAllowedSeat || isOccupied || isTakenByOtherPassenger;

                                return (
                                  <button
                                    key={`${segmentOptions.flightId}-${seatNumber}`}
                                    type="button"
                                    className={[
                                      "seat-button",
                                      index === 3 ? "seat-button-after-aisle" : "",
                                      activeFareOption && row >= activeFareOption.rowStart && row <= activeFareOption.rowEnd
                                        ? "seat-button-priority"
                                        : "",
                                      isSelected ? "seat-button-selected" : "",
                                      isUnavailable && !isSelected ? "seat-button-unavailable" : ""
                                    ].filter(Boolean).join(" ")}
                                    disabled={isUnavailable && !isSelected}
                                    onClick={() => chonGheChoHanhKhach(segmentIndex, activePassengerIndex, seatNumber)}
                                    aria-pressed={isSelected}
                                  >
                                    {seatNumber}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        <div className="seat-map-legend">
                          <span><i className="seat-legend-dot seat-legend-priority" /> Vùng ghế của hạng đã chọn</span>
                          <span><i className="seat-legend-dot seat-legend-selected" /> Ghế đang chọn</span>
                          <span><i className="seat-legend-dot seat-legend-unavailable" /> Ghế không chọn được</span>
                        </div>
                        <p className="seat-map-summary">
                          {activePassenger
                            ? `${activePassenger.fullName || `Hành khách ${activePassengerIndex + 1}`} đang chọn ${activeChoice.fareTitle || "chưa chọn hạng vé"}${activeChoice.seatNumber ? ` • Ghế ${activeChoice.seatNumber}` : " • chưa chọn ghế"}`
                            : "Hãy chọn hành khách để gán ghế cho chặng này."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {submitError ? (
                <article className="surface-card booking-inline-error">
                  <strong>Không thể giữ chỗ</strong>
                  <p>{submitError}</p>
                </article>
              ) : null}

              <div className="booking-submit-row">
                <div>
                  <span className="section-eyebrow">Tổng tiền tạm tính</span>
                  <strong className="booking-total-amount">{formatCurrency(totalAmount)}</strong>
                </div>
                <div className="booking-action-list">
                  {canConfirmBackofficeSales ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => void handleConfirmBackofficeSales()}
                      disabled={pendingSubmitAction !== null || isLoadingOptions}
                    >
                      {pendingSubmitAction === "backoffice_sales"
                        ? "Đang tạo booking hộ..."
                        : "Xác nhận đặt vé hộ"}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={pendingSubmitAction !== null || isLoadingOptions}
                  >
                    {pendingSubmitAction === "checkout" ? "Đang xử lý..." : "Tiếp tục / Giữ chỗ"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {pendingSubmitAction !== null ? (
        <div className="booking-processing-overlay" role="status" aria-live="polite">
          <div className="surface-card booking-processing-card">
            <span className="section-eyebrow">Đang xử lý</span>
            <h3>{pendingSubmitAction === "backoffice_sales" ? "Đang xác nhận đặt vé hộ" : "Đang tạo giữ chỗ"}</h3>
            <p>
              {pendingSubmitAction === "backoffice_sales"
                ? "Hệ thống đang tạo booking hộ và đưa bạn quay lại tab bán vé nội bộ."
                : "Đang giữ chỗ và tạo mã đặt chỗ cho lựa chọn hiện tại."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
