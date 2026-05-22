"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import { completeCheckin } from "@/lib/booking-api";
import { layVeCoTheCheckin } from "@/lib/booking-self-service";
import {
  fetchManageBooking,
  requestBookingLookupOtp,
  verifyBookingLookupOtp,
  type ManageBookingOverview
} from "@/lib/manage-booking-api";
import { pushToast } from "@/lib/toast";

type LookupState = "idle" | "loading" | "error" | "success";

function formatDateTime(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

function taoMaVachGia(count: number) {
  return Array.from({ length: count }, (_, index) => index);
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
  const [selectedTicketNumbers, setSelectedTicketNumbers] = useState<string[]>([]);
  const [boardingPasses, setBoardingPasses] = useState<ManageBookingOverview["boardingPasses"]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setBookingOverview(nextBookingOverview);
      setSelectedTicketNumbers(layVeCoTheCheckin(nextBookingOverview).map((ticket) => ticket.ticketNumber));
      setLookupState("success");
      return true;
    } catch (error) {
      setBookingOverview(null);
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
      setBookingOverview(latestBookingOverview);
      setBoardingPasses(response.boardingPasses);
      setSelectedTicketNumbers([]);
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

  const hienThiBoardingPasses = boardingPasses.length > 0
    ? boardingPasses
    : bookingOverview?.boardingPasses ?? [];

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card">
          <div>
            <span className="section-eyebrow">Làm thủ tục trực tuyến</span>
            <h1 className="page-title">Tra cứu PNR, chọn hành khách và nhận thẻ lên máy bay.</h1>
            <p className="page-hero-copy">
              Kiểm tra vé đủ điều kiện, hoàn tất làm thủ tục và xem vị trí ghế trên sơ đồ khoang bay.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Self-service</span>
            <h3>{bookingOverview?.bookingCode ?? "Chưa có PNR"}</h3>
            <p>{bookingOverview ? "Đã sẵn sàng làm thủ tục cho booking này." : "Nhập mã đặt chỗ để bắt đầu làm thủ tục."}</p>
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
                      ? "Phi\u00ean OTP \u0111\u00e3 h\u1ee3p l\u1ec7. B\u1ea1n c\u00f3 th\u1ec3 tra c\u1ee9u tr\u1ef1c ti\u1ebfp."
                      : "Nh\u1ea5n tra c\u1ee9u \u0111\u1ec3 nh\u1eadn OTP, sau \u0111\u00f3 x\u00e1c minh tr\u01b0\u1edbc khi xem th\u00f4ng tin."}
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
                        ? "Đã sẵn sàng để chọn hành khách."
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
                  description="Check-in pha này chỉ hỗ trợ booking một chiều có ticket đang ở trạng thái đã xuất vé."
                />

                {bookingOverview.tripType !== "one_way" ? (
                  <p>Làm thủ tục trực tuyến cho hành trình khứ hồi chưa được hỗ trợ ở giai đoạn này.</p>
                ) : danhSachVeCoTheCheckin.length > 0 ? (
                  <div className="stack-list">
                    {danhSachVeCoTheCheckin.map((ticket) => (
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
                ) : (
                  <p>Không tìm thấy vé đủ điều kiện làm thủ tục.</p>
                )}

                <div className="booking-submit-row">
                  <div>
                    <span className="section-eyebrow">Số vé đã chọn</span>
                    <strong className="booking-total-amount">{selectedTicketNumbers.length}</strong>
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
                  description="Sau khi làm thủ tục thành công, thẻ lên máy bay sẽ hiển thị ngay tại đây."
                />
                <div className="stack-list">
                  {hienThiBoardingPasses.length > 0 ? (
                    hienThiBoardingPasses.map((boardingPass) => (
                      <article key={boardingPass.ticketNumber} className="boarding-pass-card">
                        <div className="boarding-pass-head">
                          <div>
                            <span className="section-eyebrow">Boarding pass</span>
                            <h3>{boardingPass.passengerName}</h3>
                            <p>{bookingOverview.bookingCode} • {boardingPass.ticketNumber}</p>
                          </div>
                          <span className="pill">Ghế {boardingPass.seatNumber}</span>
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
                    ))
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
