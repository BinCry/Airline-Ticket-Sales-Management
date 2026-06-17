"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ApiBoardingPass, ApiManageBookingSegment, ApiManageBookingTicket } from "@qlvmb/shared-types";

import { HoldCountdown } from "@/components/hold-countdown";
import { SectionHeading } from "@/components/section-heading";
import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  buildBoardingPassPrintHtml,
  buildBoardingPassPrintModel
} from "@/lib/boarding-pass-print";
import { createRefundRequest } from "@/lib/booking-api";
import {
  coTheLamThuTuc,
  coTheYeuCauHoanVe,
  layVeCoTheYeuCauHoan,
  timPhanDoanChoVe
} from "@/lib/booking-self-service";
import { formatCurrency, formatDate, formatDateTime as dinhDangNgayGio } from "@/lib/format";
import {
  fetchManageBooking,
  requestBookingLookupOtp,
  verifyBookingLookupOtp,
  type ManageBookingOverview
} from "@/lib/manage-booking-api";
import { xuatPdfTheLenMayBay } from "@/lib/boarding-pass-pdf";
import { pushToast } from "@/lib/toast";

type LookupState = "idle" | "loading" | "error" | "success";

interface NhomVe {
  key: string;
  segment: ApiManageBookingSegment | null;
  tickets: ApiManageBookingTicket[];
}

const KHOA_HOAN_TOAN_BO = "__all__";

function formatBookingStatus(status: ManageBookingOverview["status"]) {
  switch (status) {
    case "held":
      return "Đã giữ chỗ";
    case "ticketed":
      return "Đã xuất vé";
    case "refund_pending":
      return "Đang chờ duyệt";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

function formatPaymentStatus(status: ManageBookingOverview["paymentStatus"]) {
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

function formatTicketStatus(status: ManageBookingOverview["tickets"][number]["status"]) {
  switch (status) {
    case "issued":
      return "Đã xuất vé";
    case "checked_in":
      return "Đã làm thủ tục";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

function formatRefundStatus(status: NonNullable<ManageBookingOverview["refundRequest"]>["status"]) {
  switch (status) {
    case "pending":
      return "Đang chờ duyệt";
    case "approved":
      return "Đã chấp thuận";
    case "rejected":
      return "Đã từ chối";
    default:
      return status;
  }
}

function formatTripType(tripType: ManageBookingOverview["tripType"]) {
  return tripType === "round_trip" ? "Khứ hồi" : "Một chiều";
}

function formatDateTime(value: string | null) {
  return dinhDangNgayGio(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Khong co du lieu";
  }

  const ketQuaNgayIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (ketQuaNgayIso) {
    return `${ketQuaNgayIso[3]}/${ketQuaNgayIso[2]}/${ketQuaNgayIso[1]}`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsedDate);
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

function taoDanhSachNhomVe(
  bookingOverview: ManageBookingOverview | null,
  tickets: ApiManageBookingTicket[]
): NhomVe[] {
  if (!bookingOverview) {
    return [];
  }

  const groupMap = new Map<string, NhomVe>();
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

export function ManageBookingPageClient() {
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
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("Không thể tiếp tục hành trình.");
  const [selectedRefundScopeKey, setSelectedRefundScopeKey] = useState<string>(KHOA_HOAN_TOAN_BO);
  const [isRefunding, setIsRefunding] = useState(false);
  const isHoldingBooking =
    bookingOverview?.status === "held" && bookingOverview.paymentStatus === "pending";

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken);
  }, []);

  useEffect(() => {
    const bookingCodeFromQuery = searchParams.get("bookingCode")?.trim().toUpperCase() ?? "";
    const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!bookingCodeFromQuery) {
      return;
    }

    setBookingCode(bookingCodeFromQuery);
    if (emailFromQuery) {
      setLookupEmail(emailFromQuery);
    }
    if (accessToken) {
      void traCuuBooking(bookingCodeFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, accessToken]);

  useEffect(() => {
    if (!isRefundModalOpen) {
      return;
    }

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRefundModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isRefundModalOpen]);

  const danhSachVeCoTheHoan = useMemo(
    () => (bookingOverview ? layVeCoTheYeuCauHoan(bookingOverview) : []),
    [bookingOverview]
  );

  const danhSachNhomVeCoTheHoan = useMemo(
    () => taoDanhSachNhomVe(bookingOverview, danhSachVeCoTheHoan),
    [bookingOverview, danhSachVeCoTheHoan]
  );

  const danhSachTicketDangChonHoan = useMemo(() => {
    if (selectedRefundScopeKey === KHOA_HOAN_TOAN_BO) {
      return [];
    }

    return danhSachNhomVeCoTheHoan.find((group) => group.key === selectedRefundScopeKey)?.tickets ?? [];
  }, [danhSachNhomVeCoTheHoan, selectedRefundScopeKey]);

  async function traCuuBooking(nextBookingCode: string, nextLookupToken?: string | null) {
    setLookupState("loading");
    setLookupError(null);
    setBookingOverview(null);

    try {
      const nextBookingOverview = await fetchManageBooking(
        nextBookingCode,
        accessToken,
        accessToken ? undefined : nextLookupToken ?? lookupToken ?? undefined
      );
      setBookingOverview(nextBookingOverview);
      setLookupState("success");
    } catch (error) {
      if (!accessToken && error instanceof ApiClientError && error.status === 401) {
        setLookupToken(null);
      }
      setLookupError(resolveApiClientErrorMessage(error, "Không thể tra cứu đặt chỗ lúc này."));
      setLookupState("error");
    }
  }

  async function handleRequestLookupOtp(normalizedBookingCode: string) {
    if (isSendingLookupOtp || accessToken) {
      return;
    }

    const normalizedEmail = lookupEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setLookupError("Vui lòng nhập email liên hệ của booking trước khi yêu cầu OTP.");
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
        message: "Vui lòng kiểm tra email và nhập mã OTP tra cứu.",
        tone: "success"
      });
    } catch (error) {
      setLookupError(resolveApiClientErrorMessage(error, "Không thể gửi OTP tra cứu lúc này."));
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
      await traCuuBooking(normalizedBookingCode, verified.lookupToken);
      setLookupOtp("");
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

  function handleOpenRefundModal() {
    if (danhSachNhomVeCoTheHoan.length > 1) {
      setSelectedRefundScopeKey(KHOA_HOAN_TOAN_BO);
    } else {
      setSelectedRefundScopeKey(danhSachNhomVeCoTheHoan[0]?.key ?? KHOA_HOAN_TOAN_BO);
    }
    setIsRefundModalOpen(true);
  }

  function handleExportBoardingPassPdf(boardingPass: ApiBoardingPass) {
    if (!bookingOverview) {
      return;
    }

    const segment = timPhanDoanChoBoardingPass(bookingOverview, boardingPass);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (!printWindow) {
      pushToast({
        title: "Không thể mở bản in",
        message: "Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup rồi thử lại.",
        tone: "warning"
      });
      return;
    }

    try {
      const printModel = buildBoardingPassPrintModel(
        bookingOverview.bookingCode,
        boardingPass,
        segment
      );
      printWindow.document.open();
      printWindow.document.write(buildBoardingPassPrintHtml(printModel));
      printWindow.document.close();
      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 200);
    } catch {
      printWindow.close();
      pushToast({
        title: "Xuất PDF thất bại",
        message: "Không thể chuẩn bị bản in thẻ lên máy bay lúc này.",
        tone: "danger"
      });
    }
  }

  async function handleRefundRequest() {
    if (!bookingOverview || isRefunding) {
      return;
    }

    setIsRefunding(true);

    try {
      const nextBookingOverview = await createRefundRequest(
        bookingOverview.bookingCode,
        {
          reason: refundReason.trim(),
          ticketNumbers:
            selectedRefundScopeKey === KHOA_HOAN_TOAN_BO
              ? undefined
              : danhSachTicketDangChonHoan.map((ticket) => ticket.ticketNumber)
        },
        accessToken,
        accessToken ? undefined : lookupToken ?? undefined
      );

      setBookingOverview(nextBookingOverview);
      setIsRefundModalOpen(false);
      pushToast({
        message: "Yêu cầu hoàn vé đã được ghi nhận.",
        title: "Đã gửi yêu cầu",
        tone: "success"
      });
    } catch (error) {
      setLookupError(resolveApiClientErrorMessage(error, "Không thể gửi yêu cầu hoàn vé."));
    } finally {
      setIsRefunding(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero-card">
          <div>
            <span className="section-eyebrow">Quản lý đặt chỗ</span>
            <h1 className="page-title">Tra cứu mã đặt chỗ, theo dõi vé và xử lý nhu cầu sau chuyến bay.</h1>
            <p className="page-hero-copy">
              Nhập mã đặt chỗ để xem trạng thái thanh toán, ticket theo từng chặng, boarding pass và yêu cầu hoàn vé.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Tra cứu theo PNR</span>
            <h3>{bookingOverview?.bookingCode ?? "Chưa có kết quả"}</h3>
            <p>
              {bookingOverview
                ? `${formatBookingStatus(bookingOverview.status)} • ${formatPaymentStatus(bookingOverview.paymentStatus)}`
                : "Nhập mã đặt chỗ để xem thông tin hành trình."}
            </p>
            <div className="assurance-row">
              <span className="assurance-chip">Theo dõi trạng thái vé</span>
              <span className="assurance-chip">Tự gửi yêu cầu hoàn vé</span>
            </div>
            {bookingOverview?.holdExpiresAt && isHoldingBooking ? (
              <div className="booking-summary-countdown">
                <HoldCountdown
                  expiresAt={bookingOverview.holdExpiresAt}
                  isActive={isHoldingBooking}
                />
              </div>
            ) : null}
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
              <small>Bạn có thể tra cứu mà không cần đăng nhập.</small>
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
                  <small>Dùng đúng email liên hệ đã lưu trong booking.</small>
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
              <span>Trạng thái tra cứu</span>
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
                    ? "Nhập mã đặt chỗ để bắt đầu tra cứu."
                    : lookupState === "loading"
                      ? "Đang tải thông tin đặt chỗ."
                      : lookupState === "success"
                        ? "Thông tin đặt chỗ đã sẵn sàng để kiểm tra."
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
              {lookupState === "loading" ? "Đang tải..." : "Tra cứu đặt chỗ"}
            </button>
          </div>
        </form>

        <div className="section-gap" />
        {lookupState === "success" && bookingOverview ? (
          <div className="section-split booking-manage-layout">
            <div className="stack-list">
              <article className="surface-card">
                <span className="section-eyebrow">Tóm tắt booking</span>
                <h3>Mã đặt chỗ {bookingOverview.bookingCode}</h3>
                <div className="result-grid result-grid-rich">
                  <div>
                    <span>Trạng thái booking</span>
                    <strong>{formatBookingStatus(bookingOverview.status)}</strong>
                  </div>
                  <div>
                    <span>Trạng thái thanh toán</span>
                    <strong>{formatPaymentStatus(bookingOverview.paymentStatus)}</strong>
                  </div>
                  <div>
                    <span>Giữ chỗ đến</span>
                    <strong>{formatDateTime(bookingOverview.holdExpiresAt)}</strong>
                  </div>
                </div>
                <div className="result-grid result-grid-rich">
                  <div>
                    <span>Loại hành trình</span>
                    <strong>{formatTripType(bookingOverview.tripType)}</strong>
                  </div>
                  <div>
                    <span>Xuất vé lúc</span>
                    <strong>{formatDateTime(bookingOverview.ticketedAt)}</strong>
                  </div>
                  <div>
                    <span>Tổng tiền</span>
                    <strong>{formatCurrency(bookingOverview.priceSummary.totalAmount)}</strong>
                  </div>
                </div>
              </article>

              <article className="surface-card">
                <SectionHeading
                  eyebrow="Hành trình"
                  title="Chi tiết chuyến bay"
                  description="Kiểm tra kỹ thời gian khởi hành, điểm đi, điểm đến và hạng vé đã chốt cho từng chặng."
                />
                <div className="stack-list">
                  {bookingOverview.segments.map((segment, index) => (
                    <article key={`${segment.inventoryId}-${index}`} className="surface-card booking-segment-card">
                      <div className="result-top">
                        <div>
                          <span className="section-eyebrow">Chặng {index + 1}</span>
                          <h3>{segment.code}</h3>
                          <p>{segment.from} - {segment.to}</p>
                        </div>
                        <span className="pill">{segment.fareTitle}</span>
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
                          <span>Tạm tính</span>
                          <strong>{formatCurrency(segment.subtotalAmount)}</strong>
                        </div>
                      </div>
                      <div className="result-grid result-grid-rich">
                        <div>
                          <span>Trạng thái chuyến bay</span>
                          <strong>{segment.statusLabel ?? "Theo lịch"}</strong>
                        </div>
                        <div>
                          <span>Cửa ra tàu</span>
                          <strong>{segment.gate ?? "Chờ cập nhật"}</strong>
                        </div>
                        <div>
                          <span>Ghi chú vận hành</span>
                          <strong>{segment.note ?? "Chưa có ghi chú"}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="surface-card">
                <SectionHeading
                  eyebrow="Hành khách"
                  title="Danh sách hành khách"
                  description="Thông tin hành khách dùng để đối chiếu khi xuất vé và làm thủ tục."
                />
                <div className="stack-list">
                  {bookingOverview.passengers.map((passenger, index) => (
                    <article key={`${passenger.documentNumber}-${index}`} className="surface-card booking-passenger-card">
                      <div className="result-top">
                        <div>
                          <span className="section-eyebrow">Hành khách {index + 1}</span>
                          <h3>{passenger.fullName}</h3>
                        </div>
                        <span className="pill">{passenger.passengerType}</span>
                      </div>
                      <div className="result-grid result-grid-rich">
                        <div>
                          <span>Ngày sinh</span>
                          <strong>{formatDate(passenger.dateOfBirth)}</strong>
                        </div>
                        <div>
                          <span>Giấy tờ</span>
                          <strong>{passenger.documentType}</strong>
                        </div>
                        <div>
                          <span>Số giấy tờ</span>
                          <strong>{passenger.documentNumber}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </div>

            <div className="stack-list">
              <article className="surface-card">
                <SectionHeading
                  eyebrow="Tự phục vụ"
                  title="Thao tác tiếp theo"
                  description="Check-in và hoàn vé đều được kiểm soát theo từng chặng nhưng vẫn dùng chung một mã đặt chỗ."
                />
                <div className="booking-action-list">
                  {coTheLamThuTuc(bookingOverview) ? (
                    <Link
                      href={`/check-in?bookingCode=${encodeURIComponent(bookingOverview.bookingCode)}${
                        !accessToken && lookupEmail.trim()
                          ? `&email=${encodeURIComponent(lookupEmail.trim())}`
                          : ""
                      }${
                        !accessToken && lookupToken
                          ? `&lookupToken=${encodeURIComponent(lookupToken)}`
                          : ""
                      }`}
                      className="button button-primary"
                    >
                      Làm thủ tục Check-in
                    </Link>
                  ) : null}
                  {coTheYeuCauHoanVe(bookingOverview) ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={handleOpenRefundModal}
                    >
                      Yêu cầu Hủy/Hoàn vé
                    </button>
                  ) : null}
                  {bookingOverview.status === "refund_pending" ? (
                    <article className="surface-card booking-inline-info">
                      <strong>Đang chờ duyệt</strong>
                      <p>Yêu cầu hoàn vé của bạn đã được ghi nhận và đang chờ nhân sự xử lý.</p>
                    </article>
                  ) : null}
                  {!coTheLamThuTuc(bookingOverview) && !coTheYeuCauHoanVe(bookingOverview) && bookingOverview.status !== "refund_pending" ? (
                    <article className="surface-card booking-inline-info">
                      <strong>Không có thao tác khả dụng</strong>
                      <p>Booking hiện chưa ở trạng thái phù hợp để làm thủ tục hoặc gửi yêu cầu hoàn vé.</p>
                    </article>
                  ) : null}
                </div>
              </article>

              <article className="surface-card">
                <SectionHeading
                  eyebrow="Ticket"
                  title="Vé đã phát hành"
                  description="Mỗi ticket gắn với đúng một chặng bay, nhờ vậy bạn có thể làm thủ tục và hoàn vé tách biệt theo từng chiều."
                />
                <div className="stack-list">
                  {bookingOverview.tickets.length > 0 ? (
                    bookingOverview.tickets.map((ticket) => {
                      const segment = timPhanDoanChoVe(bookingOverview, ticket);
                      return (
                        <article key={ticket.ticketNumber} className="surface-card">
                          <h3>{ticket.ticketNumber}</h3>
                          <p>{ticket.passengerName}</p>
                          {segment ? <p>{taoNhanNhomBay(segment)}</p> : null}
                          <div className="booking-ticket-meta">
                            <strong>{formatTicketStatus(ticket.status)}</strong>
                            <span>{formatDateTime(ticket.issuedAt)}</span>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <article className="surface-card">
                      <p>Không tìm thấy dữ liệu.</p>
                    </article>
                  )}
                </div>
              </article>

              <article className="surface-card">
                <SectionHeading
                  eyebrow="Boarding pass"
                  title="Thẻ lên máy bay"
                  description="Dữ liệu này được tạo sau khi hoàn tất làm thủ tục trực tuyến cho từng chặng."
                />
                <div className="stack-list">
                  {bookingOverview.boardingPasses.length > 0 ? (
                    bookingOverview.boardingPasses.map((boardingPass) => {
                      const segment = timPhanDoanChoBoardingPass(bookingOverview, boardingPass);
                      return (
                        <article key={boardingPass.ticketNumber} className="surface-card boarding-pass-mini-card">
                          <h3>{boardingPass.passengerName}</h3>
                          <p>{boardingPass.ticketNumber} • Ghế {boardingPass.seatNumber} • Cửa {boardingPass.gate}</p>
                          {segment ? <p>{taoNhanNhomBay(segment)}</p> : null}
                          <strong>{formatDateTime(boardingPass.boardingTime)}</strong>
                          <div className="auth-action-row">
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => {
                                const daMoXemTruoc = xuatPdfTheLenMayBay({
                                  boardingPass,
                                  bookingCode: bookingOverview.bookingCode,
                                  segment
                                });
                                if (!daMoXemTruoc) {
                                  pushToast({
                                    title: "Khong the xuat PDF",
                                    message: "Trinh duyet dang chan cua so in. Vui long cho phep popup roi thu lai.",
                                    tone: "warning"
                                  });
                                }
                              }}
                            >
                              Xuat PDF
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <article className="surface-card">
                      <p>Chưa có dữ liệu làm thủ tục trực tuyến.</p>
                    </article>
                  )}
                </div>
              </article>

              <article className="surface-card">
                <SectionHeading
                  eyebrow="Hoàn vé"
                  title="Trạng thái yêu cầu hoàn vé"
                  description="Nếu đã gửi yêu cầu hoàn vé, trạng thái sẽ được cập nhật tại đây."
                />
                {bookingOverview.refundRequest ? (
                  <div className="result-grid result-grid-rich">
                    <div>
                      <span>Trạng thái</span>
                      <strong>{formatRefundStatus(bookingOverview.refundRequest.status)}</strong>
                    </div>
                    <div>
                      <span>Số tiền</span>
                      <strong>{formatCurrency(bookingOverview.refundRequest.refundAmount)}</strong>
                    </div>
                    <div>
                      <span>Thời điểm gửi</span>
                      <strong>{formatDateTime(bookingOverview.refundRequest.createdAt)}</strong>
                    </div>
                    <div className="result-grid-span-full">
                      <span>Lý do</span>
                      <strong>{bookingOverview.refundRequest.reason}</strong>
                    </div>
                  </div>
                ) : (
                  <p>Chưa có yêu cầu hoàn vé cho mã đặt chỗ này.</p>
                )}
              </article>
            </div>
          </div>
        ) : (
          <article className="surface-card">
            <span className="section-eyebrow">
              {lookupState === "loading"
                ? "Đang tải"
                : lookupState === "error"
                  ? "Không thể tải dữ liệu"
                  : "Chưa có dữ liệu"}
            </span>
            <h3>
              {lookupState === "loading"
                ? "Đang tải..."
                : lookupState === "error"
                  ? "Không thể tải dữ liệu"
                  : "Chưa có dữ liệu"}
            </h3>
            <p>
              {lookupState === "idle"
                ? "Nhập mã đặt chỗ và gửi yêu cầu để xem thông tin hành trình."
                : lookupState === "loading"
                  ? "Yêu cầu tra cứu booking đang được xử lý."
                  : lookupError}
            </p>
          </article>
        )}
      </div>

      {isRefundModalOpen && bookingOverview ? (
        <div
          className="booking-modal-backdrop"
          role="presentation"
          onClick={() => setIsRefundModalOpen(false)}
        >
          <div
            className="surface-card booking-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="auth-note-head booking-modal-head">
              <div>
                <span className="section-eyebrow">Yêu cầu hoàn vé</span>
                <h3 id="refund-modal-title">Xác nhận gửi yêu cầu hoàn vé</h3>
              </div>
              <button
                type="button"
                className="profile-password-close"
                onClick={() => setIsRefundModalOpen(false)}
                aria-label="Đóng hộp thoại yêu cầu hoàn vé"
              >
                ×
              </button>
            </div>
            <p>Mã đặt chỗ {bookingOverview.bookingCode} sẽ được chuyển sang trạng thái đang chờ duyệt.</p>

            {danhSachNhomVeCoTheHoan.length > 1 ? (
              <div className="stack-list">
                <label className="booking-ticket-option">
                  <input
                    type="radio"
                    name="refund-scope"
                    checked={selectedRefundScopeKey === KHOA_HOAN_TOAN_BO}
                    onChange={() => setSelectedRefundScopeKey(KHOA_HOAN_TOAN_BO)}
                  />
                  <div>
                    <strong>Toàn bộ hành trình đủ điều kiện</strong>
                    <p>Gửi yêu cầu hoàn cho toàn bộ các ticket hiện có thể xử lý.</p>
                  </div>
                </label>
                {danhSachNhomVeCoTheHoan.map((group) => (
                  <label key={group.key} className="booking-ticket-option">
                    <input
                      type="radio"
                      name="refund-scope"
                      checked={selectedRefundScopeKey === group.key}
                      onChange={() => setSelectedRefundScopeKey(group.key)}
                    />
                    <div>
                      <strong>{taoNhanNhomBay(group.segment)}</strong>
                      <p>{group.tickets.length} ticket sẽ được đưa vào yêu cầu hoàn.</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : danhSachNhomVeCoTheHoan.length === 1 ? (
              <article className="surface-card booking-inline-info">
                <strong>{taoNhanNhomBay(danhSachNhomVeCoTheHoan[0].segment)}</strong>
                <p>{danhSachNhomVeCoTheHoan[0].tickets.length} ticket sẽ được đưa vào yêu cầu hoàn.</p>
              </article>
            ) : null}

            <label className="field">
              <span>Lý do yêu cầu</span>
              <textarea
                className="booking-textarea"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                rows={4}
              />
            </label>

            {selectedRefundScopeKey !== KHOA_HOAN_TOAN_BO && danhSachTicketDangChonHoan.length > 0 ? (
              <article className="surface-card booking-inline-info">
                <strong>Danh sách ticket được chọn</strong>
                <p>{danhSachTicketDangChonHoan.map((ticket) => ticket.ticketNumber).join(", ")}</p>
              </article>
            ) : null}

            <div className="booking-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setIsRefundModalOpen(false)}>
                Đóng
              </button>
              <button type="button" className="button button-primary" onClick={handleRefundRequest} disabled={isRefunding}>
                {isRefunding ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
