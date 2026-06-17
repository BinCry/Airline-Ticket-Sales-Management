"use client";

import type {
  ApiManageBookingOverview,
  PassengerType
} from "@qlvmb/shared-types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { createBackofficeSalesSearchHref } from "@/lib/backoffice-sales-flow";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  fetchBackofficeSalesBookings,
  issueBackofficeSalesTicket
} from "@/lib/backoffice-sales-api";
import { formatCurrency, formatDateTime as formatDateTimeText } from "@/lib/format";
import { pushToast } from "@/lib/toast";

type SalesState = "idle" | "loading" | "success" | "error";

function formatBookingStatus(status: string) {
  switch (status) {
    case "held":
      return "Đã giữ chỗ";
    case "ticketed":
      return "Đã xuất vé";
    case "refund_pending":
      return "Đang chờ duyệt hoàn vé";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

function formatPaymentStatus(status: string) {
  switch (status) {
    case "pending":
      return "Chờ thanh toán";
    case "paid":
      return "Đã thanh toán";
    case "failed":
      return "Thanh toán lỗi";
    case "expired":
      return "Đã hết hạn";
    default:
      return status;
  }
}

function formatPassengerType(type: PassengerType) {
  switch (type) {
    case "adult":
      return "Người lớn";
    case "child":
      return "Trẻ em";
    case "infant":
      return "Em bé";
    default:
      return type;
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  return formatDateTimeText(value);
}

export function BackofficeSalesPageClient() {
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [state, setState] = useState<SalesState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingCode, setBookingCode] = useState("");
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<ApiManageBookingOverview[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    const bookingCodeFromQuery = searchParams.get("bookingCode")?.trim().toUpperCase() ?? "";
    const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";

    if (!bookingCodeFromQuery && !emailFromQuery) {
      return;
    }

    setBookingCode(bookingCodeFromQuery);
    setEmail(emailFromQuery);

    if (accessToken) {
      void loadBookings(bookingCodeFromQuery, emailFromQuery, accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, accessToken]);

  async function loadBookings(nextBookingCode: string, nextEmail: string, token: string) {
    setState("loading");
    setErrorMessage(null);

    try {
      const payload = await fetchBackofficeSalesBookings(token, {
        bookingCode: nextBookingCode.trim(),
        email: nextEmail.trim(),
        limit: 20
      });
      setBookings(payload);
      setState("success");
    } catch (error) {
      setBookings([]);
      setErrorMessage(
        resolveApiClientErrorMessage(error, "Không thể tải danh sách booking nội bộ lúc này.")
      );
      setState("error");
    }
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || pendingAction !== null) {
      return;
    }

    const normalizedBookingCode = bookingCode.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedBookingCode && !normalizedEmail) {
      setErrorMessage("Vui lòng nhập mã đặt chỗ hoặc email liên hệ để tra cứu.");
      return;
    }

    await loadBookings(normalizedBookingCode, normalizedEmail, accessToken);
  }

  async function handleIssueTicket(booking: ApiManageBookingOverview) {
    if (!accessToken || pendingAction !== null) {
      return;
    }

    setPendingAction(`issue-${booking.bookingCode}`);
    setErrorMessage(null);
    try {
      const updatedBooking = await issueBackofficeSalesTicket(accessToken, booking.bookingCode);
      setBookings((currentBookings) =>
        currentBookings.map((currentBooking) =>
          currentBooking.bookingCode === updatedBooking.bookingCode ? updatedBooking : currentBooking
        )
      );
      pushToast({
        title: "Đã xuất vé hộ",
        message: `Booking ${updatedBooking.bookingCode} đã được đồng bộ trạng thái vé.`,
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể xuất vé hộ lúc này."));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice bán vé"
          title="Đặt vé hộ, tra cứu booking và xuất vé ngay tại một màn hình"
          description="Nhân sự chăm sóc khách hàng có thể mở luồng tìm chuyến bay, chọn ghế, tạo booking hộ rồi quay lại đây để theo dõi trạng thái thanh toán và xuất vé."
        />

        {errorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể xử lý yêu cầu</strong>
            <p>{errorMessage}</p>
          </article>
        ) : null}

        <form className="lookup-card" onSubmit={handleLookup}>
          <SectionHeading
            eyebrow="Tra cứu booking"
            title="Tìm nhanh theo mã đặt chỗ hoặc email liên hệ"
            description="Dùng để mở lại hồ sơ khách đã có, hoặc chuyển sang luồng tìm chuyến bay và chọn ghế để tạo booking hộ."
          />
          <div className="field-grid compact-grid">
            <label className="field">
              <span>Mã đặt chỗ</span>
              <input
                value={bookingCode}
                onChange={(event) => setBookingCode(event.target.value)}
                placeholder="Ví dụ: QC5001"
              />
            </label>
            <label className="field">
              <span>Email liên hệ</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="khach.hang@gmail.com"
              />
            </label>
          </div>
          <div className="booking-action-list booking-action-list-spacious">
            <button
              type="submit"
              className="button button-secondary"
              disabled={!accessToken || state === "loading" || pendingAction !== null}
            >
              {state === "loading" ? "Đang tra cứu..." : "Tải danh sách booking"}
            </button>
            <Link href={createBackofficeSalesSearchHref()} className="button button-primary">
              Tạo booking hộ
            </Link>
          </div>
        </form>

        <div className="section-gap" />
        <article className="table-card support-table-card">
          <div className="finance-table-head">
            <div>
              <span className="section-eyebrow">Danh sách booking</span>
              <h3>Kết quả tra cứu và xử lý nhanh</h3>
              <p>Danh sách phản ánh trạng thái thật từ hệ thống booking, payment và ticket.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table data-mobile-stack="true">
              <thead>
                <tr>
                  <th>Mã đặt chỗ</th>
                  <th>Trạng thái</th>
                  <th>Hành khách</th>
                  <th>Tổng tiền</th>
                  <th>Hạn giữ chỗ</th>
                  <th>Xuất vé lúc</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? (
                  bookings.map((booking) => {
                    const isWorking = pendingAction === `issue-${booking.bookingCode}`;
                    const canIssueTicket = booking.status === "held" || booking.paymentStatus === "pending";

                    return (
                      <tr key={booking.bookingCode}>
                        <td data-label="Mã đặt chỗ">
                          <div className="finance-cell-stack">
                            <strong>{booking.bookingCode}</strong>
                            <small>{booking.tripType === "round_trip" ? "Khứ hồi" : "Một chiều"}</small>
                          </div>
                        </td>
                        <td data-label="Trạng thái">
                          <div className="finance-cell-stack">
                            <strong>{formatBookingStatus(booking.status)}</strong>
                            <small>{formatPaymentStatus(booking.paymentStatus)}</small>
                          </div>
                        </td>
                        <td data-label="Hành khách">
                          <div className="finance-cell-stack">
                            {booking.passengers.map((passenger) => (
                              <span key={`${booking.bookingCode}-${passenger.fullName}`}>
                                {passenger.fullName} · {formatPassengerType(passenger.passengerType)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td data-label="Tổng tiền">{formatCurrency(booking.priceSummary.totalAmount)}</td>
                        <td data-label="Hạn giữ chỗ">{formatDateTime(booking.holdExpiresAt)}</td>
                        <td data-label="Xuất vé lúc">{formatDateTime(booking.ticketedAt)}</td>
                        <td data-label="Hành động">
                          <div className="finance-action-row">
                            <Link
                              href={`/manage-booking?bookingCode=${encodeURIComponent(booking.bookingCode)}`}
                              className="button button-secondary"
                            >
                              Mở hồ sơ
                            </Link>
                            {canIssueTicket ? (
                              <button
                                type="button"
                                className="button button-primary"
                                onClick={() => void handleIssueTicket(booking)}
                                disabled={pendingAction !== null}
                              >
                                {isWorking ? "Đang xuất vé..." : "Xuất vé hộ"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <article className="booking-inline-info">
                        <strong>{state === "loading" ? "Đang tải..." : "Chưa có kết quả"}</strong>
                        <p>
                          {state === "loading"
                            ? "Đang tải danh sách booking nội bộ."
                            : "Nhập mã đặt chỗ hoặc email liên hệ để bắt đầu tra cứu."}
                        </p>
                      </article>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
