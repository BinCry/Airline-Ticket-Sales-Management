"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ApiBoardingPass, ApiManageBookingSegment, ApiManageBookingTicket } from "@qlvmb/shared-types";

import { SectionHeading } from "@/components/section-heading";
import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import { xuatBoardingPassPdf } from "@/lib/boarding-pass-pdf";
import { completeCheckin } from "@/lib/booking-api";
import { layVeCoTheCheckin, timPhanDoanChoVe } from "@/lib/booking-self-service";
import { formatDateTime as formatDateTimeText } from "@/lib/format";
import {
  fetchManageBooking,
  requestBookingLookupOtp,
  verifyBookingLookupOtp,
  type ManageBookingOverview
} from "@/lib/manage-booking-api";
import { pushToast } from "@/lib/toast";

type LookupState = "idle" | "loading" | "error" | "success";

interface NhomCheckin {
  key: string;
  segment: ApiManageBookingSegment | null;
  tickets: ApiManageBookingTicket[];
}

function formatDateTime(value: string) {
  return formatDateTimeText(value);
}

function taoMaVachGia(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

function taoKhoaNhomBay(segment: ApiManageBookingSegment | null, ticketNumber: string) {
  if (!segment) {
    return `ticket-${ticketNumber}`;
  }

  return [
    segment.code,
    segment.originCode,
    segment.destinationCode,
    segment.departureAt
  ].join("|");
}

function taoNhanNhomBay(segment: ApiManageBookingSegment | null) {
  if (!segment) {
    return "Chặng chưa xác định";
  }

  return `${segment.code} • ${segment.from} - ${segment.to} • ${formatDateTime(segment.departureAt)}`;
}

function taoDanhSachNhomCheckin(
  bookingOverview: ManageBookingOverview | null,
  tickets: ApiManageBookingTicket[]
): NhomCheckin[] {
  if (!bookingOverview) {
    return [];
  }

  const groupMap = new Map<string, NhomCheckin>();
  tickets.forEach((ticket) => {
    const segment = timPhanDoanChoVe(bookingOverview, ticket);
    const key = taoKhoaNhomBay(segment, ticket.ticketNumber);
    const existingGroup = groupMap.get(key);
    if (existingGroup) {
      existingGroup.tickets.push(ticket);
      return;
    }

    groupMap.set(key, {
      key,
      segment,
      tickets: [ticket]
    });
  });

  return Array.from(groupMap.values());
}

function timPhanDoanChoBoardingPass(
  bookingOverview: ManageBookingOverview | null,
  boardingPass: ApiBoardingPass
) {
  if (!bookingOverview || typeof boardingPass.inventoryId !== "number") {
    return null;
  }

  return bookingOverview.segments.find((segment) => segment.inventoryId === boardingPass.inventoryId) ?? null;
}

export function CheckInPageClient() {
  const searchParams = useSearchParams();
  const [bookingCode, setBookingCode] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupOtp, setLookupOtp] = useState("");
  const [lookupToken, setLookupToken] = useState<string | null>(null);
  const [isSendingLookupOtp, setIsSendingLookupOtp] = useState(false);
  const [isVerifyingLookupOtp, setIsVerifyingLookupOtp] = useState(false);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [bookingOverview, setBookingOverview] = useState<ManageBookingOverview | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [selectedFlightGroupKey, setSelectedFlightGroupKey] = useState<string | null>(null);
  const [selectedTicketNumbers, setSelectedTicketNumbers] = useState<string[]>([]);
  const [boardingPasses, setBoardingPasses] = useState<ManageBookingOverview["boardingPasses"]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportingTicketNumber, setExportingTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken);
  }, []);

  useEffect(() => {
    const bookingCodeFromQuery = searchParams.get("bookingCode")?.trim().toUpperCase() ?? "";
    const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";
    const lookupTokenFromQuery = searchParams.get("lookupToken")?.trim() ?? "";
    if (!bookingCodeFromQuery) {
      return;
    }

    setBookingCode(bookingCodeFromQuery);
    if (emailFromQuery) {
      setLookupEmail(emailFromQuery);
    }
    if (lookupTokenFromQuery) {
      setLookupToken(lookupTokenFromQuery);
    }
    if (accessToken || lookupTokenFromQuery) {
      void traCuuBooking(bookingCodeFromQuery, lookupTokenFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, accessToken]);

  const danhSachVeCoTheCheckin = useMemo(
    () => (bookingOverview ? layVeCoTheCheckin(bookingOverview) : []),
    [bookingOverview]
  );

  const danhSachNhomCheckin = useMemo(
    () => taoDanhSachNhomCheckin(bookingOverview, danhSachVeCoTheCheckin),
    [bookingOverview, danhSachVeCoTheCheckin]
  );

  const nhomCheckinDangChon = useMemo(
    () => danhSachNhomCheckin.find((group) => group.key === selectedFlightGroupKey) ?? null,
    [danhSachNhomCheckin, selectedFlightGroupKey]
  );

  async function traCuuBooking(nextBookingCode: string, nextLookupToken?: string | null) {
    setLookupState("loading");
    setLookupError(null);
    setBoardingPasses([]);

    try {
      const nextBookingOverview = await fetchManageBooking(
        nextBookingCode,
        accessToken,
        accessToken ? undefined : nextLookupToken ?? lookupToken ?? undefined
      );
      const nextTickets = layVeCoTheCheckin(nextBookingOverview);
      const nextGroups = taoDanhSachNhomCheckin(nextBookingOverview, nextTickets);
      const firstGroup = nextGroups[0] ?? null;

      setBookingOverview(nextBookingOverview);
      setSelectedFlightGroupKey(firstGroup?.key ?? null);
      setSelectedTicketNumbers(firstGroup ? firstGroup.tickets.map((ticket) => ticket.ticketNumber) : []);
      setLookupState("success");
      return true;
    } catch (error) {
      setBookingOverview(null);
      setSelectedFlightGroupKey(null);
      setSelectedTicketNumbers([]);
      if (!accessToken && error instanceof ApiClientError && error.status === 401) {
        setLookupToken(null);
      }
      setLookupError(resolveApiClientErrorMessage(error, "Không thể tra cứu check-in lúc này."));
      setLookupState("error");
      return false;
    }
  }

  async function handleRequestLookupOtp(normalizedBookingCode: string) {
    if (isSendingLookupOtp || accessToken) {
      return;
    }

    const normalizedEmail = lookupEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setLookupError("Vui lòng nhập email liên hệ booking trước khi yêu cầu OTP.");
      setLookupState("error");
      return;
    }

    setIsSendingLookupOtp(true);
    setLookupError(null);
    try {
      await requestBookingLookupOtp({
        bookingCode: normalizedBookingCode,
        email: normalizedEmail
      });
      setLookupState("idle");
      pushToast({
        title: "Đã gửi OTP",
        message: "Vui lòng kiểm tra email và nhập OTP trực tiếp trên màn hình này.",
        tone: "success"
      });
    } catch (error) {
      setLookupError(resolveApiClientErrorMessage(error, "Không thể gửi OTP tra cứu."));
      setLookupState("error");
    } finally {
      setIsSendingLookupOtp(false);
    }
  }

  async function handleVerifyLookupOtp(normalizedBookingCode: string) {
    if (isVerifyingLookupOtp || accessToken) {
      return;
    }

    const normalizedEmail = lookupEmail.trim().toLowerCase();
    const normalizedOtp = lookupOtp.trim();
    if (!normalizedEmail || normalizedOtp.length !== 6) {
      setLookupError("Vui lòng nhập đầy đủ email và mã OTP 6 số.");
      setLookupState("error");
      return;
    }

    setIsVerifyingLookupOtp(true);
    setLookupError(null);
    try {
      const verified = await verifyBookingLookupOtp({
        bookingCode: normalizedBookingCode,
        email: normalizedEmail,
        otp: normalizedOtp
      });
      setLookupToken(verified.lookupToken);
      const daTraCuuThanhCong = await traCuuBooking(normalizedBookingCode, verified.lookupToken);
      if (daTraCuuThanhCong) {
        setLookupOtp("");
      }
    } catch (error) {
      setLookupError(resolveApiClientErrorMessage(error, "Không thể xác minh OTP tra cứu."));
      setLookupState("error");
    } finally {
      setIsVerifyingLookupOtp(false);
    }
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBookingCode = bookingCode.trim().toUpperCase();
    if (!normalizedBookingCode || lookupState === "loading") {
      return;
    }

    if (!accessToken && !lookupToken) {
      await handleRequestLookupOtp(normalizedBookingCode);
      return;
    }

    await traCuuBooking(normalizedBookingCode);
  }

  function handleSelectFlightGroup(groupKey: string) {
    const selectedGroup = danhSachNhomCheckin.find((group) => group.key === groupKey);
    setSelectedFlightGroupKey(groupKey);
    setSelectedTicketNumbers(selectedGroup ? selectedGroup.tickets.map((ticket) => ticket.ticketNumber) : []);
  }

  function toggleTicket(ticketNumber: string) {
    setSelectedTicketNumbers((currentTickets) =>
      currentTickets.includes(ticketNumber)
        ? currentTickets.filter((currentTicket) => currentTicket !== ticketNumber)
        : [...currentTickets, ticketNumber]
    );
  }

  async function handleCompleteCheckin() {
    if (!bookingOverview || selectedTicketNumbers.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setLookupError(null);

    try {
      const response = await completeCheckin(
        {
          bookingCode: bookingOverview.bookingCode,
          ticketNumbers: selectedTicketNumbers
        },
        accessToken,
        accessToken ? undefined : lookupToken ?? undefined
      );

      const latestBookingOverview = await fetchManageBooking(
        bookingOverview.bookingCode,
        accessToken,
        accessToken ? undefined : lookupToken ?? undefined
      );
      const nextTickets = layVeCoTheCheckin(latestBookingOverview);
      const nextGroups = taoDanhSachNhomCheckin(latestBookingOverview, nextTickets);
      const firstGroup = nextGroups[0] ?? null;

      setBookingOverview(latestBookingOverview);
      setBoardingPasses(response.boardingPasses);
      setSelectedFlightGroupKey(firstGroup?.key ?? null);
      setSelectedTicketNumbers(firstGroup ? firstGroup.tickets.map((ticket) => ticket.ticketNumber) : []);
      pushToast({
        message: "Làm thủ tục trực tuyến thành công.",
        title: "Đã tạo thẻ lên máy bay",
        tone: "success"
      });
    } catch (error) {
      setLookupError(resolveApiClientErrorMessage(error, "Không thể hoàn tất làm thủ tục trực tuyến."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExportBoardingPass(boardingPass: ApiBoardingPass) {
    if (!bookingOverview || exportingTicketNumber) {
      return;
    }

    const segment = timPhanDoanChoBoardingPass(bookingOverview, boardingPass);
    setExportingTicketNumber(boardingPass.ticketNumber);

    try {
      await xuatBoardingPassPdf({
        bookingCode: bookingOverview.bookingCode,
        boardingPass,
        boardingTimeLabel: formatDateTime(boardingPass.boardingTime),
        segmentLabel: segment ? taoNhanNhomBay(segment) : null
      });
      pushToast({
        title: "Đã xuất file PDF",
        message: "Thẻ lên máy bay đã được tải về thiết bị.",
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: "Không thể xuất PDF",
        message: error instanceof Error ? error.message : "Đã có lỗi khi tạo file thẻ lên máy bay.",
        tone: "danger"
      });
    } finally {
      setExportingTicketNumber(null);
    }
  }

  const hienThiBoardingPasses = boardingPasses.length > 0
    ? boardingPasses
    : bookingOverview?.boardingPasses ?? [];

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card">
          <div>
            <span className="section-eyebrow">Làm thủ tục trực tuyến</span>
            <h1 className="page-title">Tra cứu PNR, chọn chặng bay và nhận thẻ lên máy bay.</h1>
            <p className="page-hero-copy">
              Kiểm tra vé đủ điều kiện, làm thủ tục theo từng chiều bay và xem vị trí ghế ngay sau khi hoàn tất.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Self-service</span>
            <h3>{bookingOverview?.bookingCode ?? "Chưa có PNR"}</h3>
            <p>
              {bookingOverview
                ? "Đã sẵn sàng làm thủ tục cho booking này."
                : "Nhập mã đặt chỗ để bắt đầu làm thủ tục."}
            </p>
          </div>
        </div>

        <div className="section-gap" />
        <form className="lookup-card" onSubmit={handleLookup}>
          <div className="field-grid compact-grid">
            <label className="field">
              <span>Mã đặt chỗ</span>
              <input
                value={bookingCode}
                onChange={(event) => {
                  setBookingCode(event.target.value);
                  if (!accessToken) {
                    setLookupToken(null);
                    setLookupOtp("");
                  }
                }}
                placeholder="Ví dụ: A6C2P1"
              />
            </label>
            {!accessToken ? (
              <>
                <label className="field">
                  <span>Email liên hệ booking</span>
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={(event) => {
                      setLookupEmail(event.target.value);
                      setLookupToken(null);
                    }}
                    placeholder="tenban@gmail.com"
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  <span>Mã OTP tra cứu</span>
                  <input
                    value={lookupOtp}
                    onChange={(event) => setLookupOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Nhập 6 số OTP"
                    inputMode="numeric"
                    maxLength={6}
                  />
                  <small>
                    {lookupToken
                      ? "Phiên OTP đã hợp lệ. Bạn có thể tra cứu trực tiếp."
                      : "Nhấn tra cứu để nhận OTP, sau đó xác minh trước khi xem thông tin."}
                  </small>
                </label>
              </>
            ) : null}
            <div className="field field-inline">
              <span>Trạng thái</span>
              <div className="surface-card">
                <strong>
                  {lookupState === "loading"
                    ? "Đang tải..."
                    : lookupState === "success"
                      ? "Đã tải dữ liệu"
                      : lookupState === "error"
                        ? "Tra cứu thất bại"
                        : "Chưa tra cứu"}
                </strong>
                <p>
                  {lookupState === "idle"
                    ? "Nhập PNR để xem hành khách và vé đủ điều kiện làm thủ tục."
                    : lookupState === "loading"
                      ? "Đang tải thông tin đặt chỗ."
                      : lookupState === "success"
                        ? "Đã sẵn sàng để chọn chặng và hành khách."
                        : lookupError}
                </p>
              </div>
            </div>
            {!accessToken ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void handleVerifyLookupOtp(bookingCode.trim().toUpperCase())}
                disabled={isVerifyingLookupOtp || lookupOtp.trim().length !== 6 || bookingCode.trim().length === 0}
              >
                {isVerifyingLookupOtp ? "Đang xác minh..." : "Xác minh OTP"}
              </button>
            ) : null}
            <button
              type="submit"
              className="button button-primary"
              disabled={lookupState === "loading" || isSendingLookupOtp || isVerifyingLookupOtp}
            >
              {lookupState === "loading" ? "Đang tải..." : "Tra cứu Check-in"}
            </button>
          </div>
        </form>

        <div className="section-gap" />
        {bookingOverview ? (
          <div className="section-split booking-manage-layout">
            <div className="stack-list">
              <article className="surface-card">
                <SectionHeading
                  eyebrow="Danh sách hành khách"
                  title="Chọn vé cần làm thủ tục"
                  description="Mỗi lần check-in chỉ xử lý một chiều bay. Bạn có thể đổi sang chặng khác và tiếp tục làm thủ tục ở thời điểm phù hợp."
                />

                {danhSachNhomCheckin.length > 0 ? (
                  <div className="stack-list">
                    {danhSachNhomCheckin.length > 1 ? (
                      <div className="stack-list">
                        {danhSachNhomCheckin.map((group) => (
                          <label key={group.key} className="booking-ticket-option">
                            <input
                              type="radio"
                              name="checkin-flight-group"
                              checked={selectedFlightGroupKey === group.key}
                              onChange={() => handleSelectFlightGroup(group.key)}
                            />
                            <div>
                              <strong>{taoNhanNhomBay(group.segment)}</strong>
                              <p>{group.tickets.length} vé có thể làm thủ tục ở chặng này.</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : null}

                    <div className="stack-list">
                      {(nhomCheckinDangChon?.tickets ?? []).map((ticket) => (
                        <label key={ticket.ticketNumber} className="booking-ticket-option">
                          <input
                            type="checkbox"
                            checked={selectedTicketNumbers.includes(ticket.ticketNumber)}
                            onChange={() => toggleTicket(ticket.ticketNumber)}
                          />
                          <div>
                            <strong>{ticket.passengerName}</strong>
                            <p>{ticket.ticketNumber}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>Không tìm thấy vé đủ điều kiện làm thủ tục.</p>
                )}

                <div className="booking-submit-row">
                  <div>
                    <span className="section-eyebrow">
                      {nhomCheckinDangChon ? "Chặng đang chọn" : "Số vé đã chọn"}
                    </span>
                    <strong className="booking-total-amount">
                      {nhomCheckinDangChon ? taoNhanNhomBay(nhomCheckinDangChon.segment) : selectedTicketNumbers.length}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={selectedTicketNumbers.length === 0 || isSubmitting}
                    onClick={handleCompleteCheckin}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Hoàn tất Check-in"}
                  </button>
                </div>
              </article>
            </div>

            <div className="stack-list">
              <article className="surface-card">
                <SectionHeading
                  eyebrow="Boarding pass"
                  title="Thẻ lên máy bay"
                  description="Sau khi làm thủ tục thành công, thẻ lên máy bay của đúng chặng đã chọn sẽ hiển thị ngay tại đây."
                />
                <div className="stack-list">
                  {hienThiBoardingPasses.length > 0 ? (
                    hienThiBoardingPasses.map((boardingPass) => {
                      const segment = timPhanDoanChoBoardingPass(bookingOverview, boardingPass);
                      const isDangXuatPdf = exportingTicketNumber === boardingPass.ticketNumber;
                      return (
                        <article key={boardingPass.ticketNumber} className="boarding-pass-card">
                          <div className="boarding-pass-head">
                            <div>
                              <span className="section-eyebrow">Boarding pass</span>
                              <h3>{boardingPass.passengerName}</h3>
                              <p>{bookingOverview.bookingCode} • {boardingPass.ticketNumber}</p>
                              {segment ? <p>{taoNhanNhomBay(segment)}</p> : null}
                            </div>
                            <div className="boarding-pass-actions">
                              <span className="pill">Ghế {boardingPass.seatNumber}</span>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => void handleExportBoardingPass(boardingPass)}
                                disabled={Boolean(exportingTicketNumber)}
                              >
                                {isDangXuatPdf ? "Đang xuất..." : "Xuất pdf"}
                              </button>
                            </div>
                          </div>
                          <div className="result-grid result-grid-rich">
                            <div>
                              <span>Cửa ra tàu</span>
                              <strong>{boardingPass.gate}</strong>
                            </div>
                            <div>
                              <span>Giờ boarding</span>
                              <strong>{formatDateTime(boardingPass.boardingTime)}</strong>
                            </div>
                            <div>
                              <span>Mã barcode</span>
                              <strong>{boardingPass.barcode}</strong>
                            </div>
                          </div>
                          <div className="barcode-strip" aria-hidden="true">
                            {taoMaVachGia(28).map((barIndex) => (
                              <span
                                key={`${boardingPass.ticketNumber}-${barIndex}`}
                                className={barIndex % 3 === 0 ? "barcode-bar barcode-bar-thick" : "barcode-bar"}
                              />
                            ))}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <article className="surface-card">
                      <p>Chưa có thẻ lên máy bay được tạo.</p>
                    </article>
                  )}
                </div>
              </article>
            </div>
          </div>
        ) : (
          <article className="surface-card">
            <span className="section-eyebrow">Chưa có dữ liệu</span>
            <h3>Chưa có dữ liệu</h3>
            <p>Nhập mã đặt chỗ để tải danh sách hành khách và vé đủ điều kiện làm thủ tục.</p>
          </article>
        )}
      </div>
    </section>
  );
}
