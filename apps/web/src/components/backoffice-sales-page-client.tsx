"use client";

import type {
  ApiCreateBookingHoldRequest,
  ApiManageBookingOverview,
  PassengerType
} from "@qlvmb/shared-types";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  createBackofficeSalesBooking,
  fetchBackofficeSalesBookings,
  issueBackofficeSalesTicket
} from "@/lib/backoffice-sales-api";
import { formatCurrency } from "@/lib/format";
import { pushToast } from "@/lib/toast";

type SalesState = "idle" | "loading" | "success" | "error";

type SalesCreateFormState = {
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  documentNumber: string;
  documentType: string;
  inventoryId: string;
  passengerDateOfBirth: string;
  passengerName: string;
  passengerType: PassengerType;
  returnInventoryId: string;
};

const EMPTY_CREATE_FORM: SalesCreateFormState = {
  contactEmail: "",
  contactName: "",
  contactPhone: "",
  documentNumber: "",
  documentType: "CCCD",
  inventoryId: "",
  passengerDateOfBirth: "",
  passengerName: "",
  passengerType: "adult",
  returnInventoryId: ""
};

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

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

function normalizePositiveInteger(value: string) {
  const normalized = Number(value.trim());
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
}

function buildCreatePayload(form: SalesCreateFormState): ApiCreateBookingHoldRequest | null {
  const outboundInventoryId = normalizePositiveInteger(form.inventoryId);
  if (!outboundInventoryId) {
    return null;
  }

  const returnInventoryId = form.returnInventoryId.trim()
    ? normalizePositiveInteger(form.returnInventoryId)
    : null;
  if (form.returnInventoryId.trim() && !returnInventoryId) {
    return null;
  }

  const payload: ApiCreateBookingHoldRequest = {
    tripType: returnInventoryId ? "round_trip" : "one_way",
    contact: {
      fullName: form.contactName.trim(),
      email: form.contactEmail.trim().toLowerCase(),
      phone: form.contactPhone.trim()
    },
    passengers: [
      {
        fullName: form.passengerName.trim(),
        passengerType: form.passengerType,
        dateOfBirth: form.passengerDateOfBirth,
        documentType: form.documentType.trim(),
        documentNumber: form.documentNumber.trim()
      }
    ],
    segments: returnInventoryId
      ? [{ inventoryId: outboundInventoryId }, { inventoryId: returnInventoryId }]
      : [{ inventoryId: outboundInventoryId }],
    ancillaries: [],
    seatSelections: []
  };

  return payload;
}

export function BackofficeSalesPageClient() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [state, setState] = useState<SalesState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingCode, setBookingCode] = useState("");
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<ApiManageBookingOverview[]>([]);
  const [createForm, setCreateForm] = useState<SalesCreateFormState>(EMPTY_CREATE_FORM);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

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

  async function handleCreateBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || pendingAction !== null) {
      return;
    }

    const payload = buildCreatePayload(createForm);
    if (!payload) {
      setErrorMessage("Inventory không hợp lệ. Vui lòng nhập số dương cho mã inventory.");
      return;
    }

    if (
      !payload.contact.fullName ||
      !payload.contact.email ||
      !payload.contact.phone ||
      !payload.passengers[0].fullName ||
      !payload.passengers[0].dateOfBirth ||
      !payload.passengers[0].documentType ||
      !payload.passengers[0].documentNumber
    ) {
      setErrorMessage("Vui lòng điền đủ thông tin liên hệ và hành khách trước khi tạo booking hộ.");
      return;
    }

    setPendingAction("create");
    setErrorMessage(null);
    try {
      const created = await createBackofficeSalesBooking(accessToken, payload);
      setBookingCode(created.bookingCode);
      setEmail(payload.contact.email);
      setCreateForm((current) => ({
        ...EMPTY_CREATE_FORM,
        contactEmail: current.contactEmail,
        contactName: current.contactName,
        contactPhone: current.contactPhone
      }));
      await loadBookings(created.bookingCode, payload.contact.email, accessToken);
      pushToast({
        title: "Đã tạo giữ chỗ hộ",
        message: `Booking ${created.bookingCode} đã được tạo thành công.`,
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể tạo booking hộ lúc này."));
    } finally {
      setPendingAction(null);
    }
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
          description="Nhân sự chăm sóc khách hàng có thể tạo giữ chỗ hộ theo inventory, theo dõi trạng thái thanh toán và xuất vé khi đã đủ điều kiện."
        />

        {errorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể xử lý yêu cầu</strong>
            <p>{errorMessage}</p>
          </article>
        ) : null}

        <div className="section-split">
          <form className="lookup-card" onSubmit={handleLookup}>
            <SectionHeading
              eyebrow="Tra cứu booking"
              title="Tìm nhanh theo mã đặt chỗ hoặc email liên hệ"
              description="Dùng để mở lại hồ sơ khách đã có và kiểm tra trạng thái giữ chỗ, thanh toán, xuất vé."
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
            </div>
          </form>

          <form className="surface-card" onSubmit={handleCreateBooking}>
            <SectionHeading
              eyebrow="Đặt vé hộ tối thiểu"
              title="Tạo giữ chỗ hộ cho khách"
              description="Luồng v1 dùng inventory ID có sẵn để tạo giữ chỗ nhanh, sau đó có thể xuất vé ngay trên cùng danh sách."
            />
            <div className="field-grid compact-grid">
              <label className="field">
                <span>Inventory đi</span>
                <input
                  type="number"
                  min={1}
                  value={createForm.inventoryId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      inventoryId: event.target.value
                    }))
                  }
                  placeholder="Ví dụ: 101"
                />
              </label>
              <label className="field">
                <span>Inventory về (nếu khứ hồi)</span>
                <input
                  type="number"
                  min={1}
                  value={createForm.returnInventoryId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      returnInventoryId: event.target.value
                    }))
                  }
                  placeholder="Ví dụ: 132"
                />
              </label>
              <label className="field">
                <span>Tên liên hệ</span>
                <input
                  value={createForm.contactName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      contactName: event.target.value
                    }))
                  }
                  placeholder="Nguyễn Văn A"
                />
              </label>
              <label className="field">
                <span>Email liên hệ</span>
                <input
                  value={createForm.contactEmail}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      contactEmail: event.target.value
                    }))
                  }
                  placeholder="khach.hang@gmail.com"
                />
              </label>
              <label className="field">
                <span>Số điện thoại</span>
                <input
                  value={createForm.contactPhone}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      contactPhone: event.target.value
                    }))
                  }
                  placeholder="0900000001"
                />
              </label>
              <label className="field">
                <span>Họ tên hành khách</span>
                <input
                  value={createForm.passengerName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      passengerName: event.target.value
                    }))
                  }
                  placeholder="Nguyễn Văn A"
                />
              </label>
              <label className="field">
                <span>Loại hành khách</span>
                <select
                  value={createForm.passengerType}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      passengerType: event.target.value as PassengerType
                    }))
                  }
                >
                  <option value="adult">Người lớn</option>
                  <option value="child">Trẻ em</option>
                  <option value="infant">Em bé</option>
                </select>
              </label>
              <label className="field">
                <span>Ngày sinh</span>
                <input
                  type="date"
                  value={createForm.passengerDateOfBirth}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      passengerDateOfBirth: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Loại giấy tờ</span>
                <input
                  value={createForm.documentType}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      documentType: event.target.value
                    }))
                  }
                  placeholder="CCCD"
                />
              </label>
              <label className="field">
                <span>Số giấy tờ</span>
                <input
                  value={createForm.documentNumber}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      documentNumber: event.target.value
                    }))
                  }
                  placeholder="012345678901"
                />
              </label>
            </div>
            <div className="booking-action-list booking-action-list-spacious">
              <button
                type="submit"
                className="button button-primary"
                disabled={!accessToken || pendingAction !== null}
              >
                {pendingAction === "create" ? "Đang tạo giữ chỗ..." : "Tạo booking hộ"}
              </button>
            </div>
          </form>
        </div>

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
