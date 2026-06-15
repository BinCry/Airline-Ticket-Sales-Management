"use client";

import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { StatusChip } from "@/components/status-chip";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  cancelBackofficeOperationsFlight,
  createBackofficeOperationsFlight,
  createBackofficeOperationsVoucher,
  fetchBackofficeOperationsFlights,
  fetchBackofficeOperationsVouchers,
  hideBackofficeOperationsVoucher,
  hideCancelledBackofficeOperationsFlight,
  revokeBackofficeOperationsVoucher,
  type BackofficeFareReadonlyItem,
  type BackofficeOperationsFlightCreateInput,
  type BackofficeOperationsFlightItem,
  type BackofficeOperationsUpdateInput,
  type BackofficeVoucherCreateInput,
  type BackofficeVoucherItem,
  type BackofficeVoucherUpdateInput,
  updateBackofficeOperationsFlight,
  updateBackofficeOperationsVoucher
} from "@/lib/backoffice-operations-api";
import { layLopMauGoiGia } from "@/lib/display";
import { pushToast } from "@/lib/toast";

type OperationsState = "idle" | "loading" | "success" | "error";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Theo lịch" },
  { value: "on_time", label: "Đúng giờ" },
  { value: "boarding", label: "Đang lên máy bay" },
  { value: "delayed", label: "Trễ" },
  { value: "departed", label: "Đã khởi hành" },
  { value: "landed", label: "Đã hạ cánh" },
  { value: "cancelled", label: "Đã hủy" }
] as const;

const FLIGHT_UPDATE_STATUS_OPTIONS = STATUS_OPTIONS.filter((option) => option.value !== "cancelled");

const toneMap = {
  scheduled: "neutral",
  on_time: "success",
  boarding: "info",
  delayed: "warning",
  departed: "neutral",
  landed: "success",
  cancelled: "danger"
} as const;

const VOUCHER_STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "AVAILABLE", label: "Khả dụng" },
  { value: "RESERVED", label: "Đang giữ chỗ" },
  { value: "USED", label: "Đã sử dụng" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "REVOKED", label: "Đã thu hồi" }
] as const;

const VOUCHER_EDITABLE_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Khả dụng" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "REVOKED", label: "Đã thu hồi" }
] as const;

const HANG_VE_CO_DINH = [
  { fareFamily: "pho_thong_tiet_kiem", title: "Phổ thông tiết kiệm", totalSeats: 120, rowStart: 9, rowEnd: 28, priceOffset: 0 },
  { fareFamily: "pho_thong_linh_hoat", title: "Phổ thông linh hoạt", totalSeats: 36, rowStart: 3, rowEnd: 8, priceOffset: 500000 },
  { fareFamily: "thuong_gia", title: "Thương gia", totalSeats: 12, rowStart: 1, rowEnd: 2, priceOffset: 1000000 }
] as const;

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

function formatCurrency(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatVoucherStatus(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "Khả dụng";
    case "RESERVED":
      return "Đang giữ chỗ";
    case "USED":
      return "Đã sử dụng";
    case "EXPIRED":
      return "Hết hạn";
    case "REVOKED":
      return "Đã thu hồi";
    default:
      return status;
  }
}

function resolveVoucherTone(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "success";
    case "RESERVED":
      return "warning";
    case "USED":
      return "neutral";
    case "EXPIRED":
      return "danger";
    case "REVOKED":
      return "neutral";
    default:
      return "info";
  }
}

function toDateTimeLocalValue(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }
  const timezoneOffset = parsedDate.getTimezoneOffset() * 60_000;
  return new Date(parsedDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toApiDateTimeValue(value: string) {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
}

function createDefaultVoucherExpiryValue() {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 14);
  currentDate.setHours(10, 0, 0, 0);
  return toDateTimeLocalValue(currentDate.toISOString());
}

function createDefaultFlightDepartureValue() {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);
  currentDate.setHours(8, 30, 0, 0);
  return toDateTimeLocalValue(currentDate.toISOString());
}

function createDefaultFlightArrivalValue() {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);
  currentDate.setHours(10, 30, 0, 0);
  return toDateTimeLocalValue(currentDate.toISOString());
}

function createEmptyFlightForm(): BackofficeOperationsFlightCreateInput {
  return {
    code: "",
    originCode: "",
    destinationCode: "",
    departureAt: createDefaultFlightDepartureValue(),
    arrivalAt: createDefaultFlightArrivalValue(),
    gate: "",
    note: "",
    salesOpen: true,
    baseFare: 1200000
  };
}

function createEmptyVoucherForm(): BackofficeVoucherCreateInput {
  return {
    memberEmail: "",
    voucherCode: "",
    title: "",
    description: "",
    discountAmount: 100000,
    currency: "VND",
    expiresAt: createDefaultVoucherExpiryValue()
  };
}

function buildFlightDraft(flight: BackofficeOperationsFlightItem): BackofficeOperationsUpdateInput {
  return {
    status: flight.status,
    gate: flight.gate,
    note: flight.note,
    salesOpen: flight.salesOpen,
    baseFare: flight.baseFare
  };
}

function taoDanhSachHangVeCoDinh(baseFare: number): BackofficeFareReadonlyItem[] {
  return HANG_VE_CO_DINH.map((fare) => ({
    fareFamily: fare.fareFamily,
    title: fare.title,
    totalSeats: fare.totalSeats,
    rowStart: fare.rowStart,
    rowEnd: fare.rowEnd,
    price: baseFare + fare.priceOffset
  }));
}

function capNhatGiaGocHopLe(value: string, giaMacDinh: number): number {
  const giaDaNhap = Number(value);
  if (!Number.isFinite(giaDaNhap) || giaDaNhap < 1) {
    return giaMacDinh;
  }

  return Math.round(giaDaNhap);
}

function buildVoucherDraft(voucher: BackofficeVoucherItem): BackofficeVoucherUpdateInput {
  return {
    title: voucher.title,
    description: voucher.description,
    discountAmount: voucher.discountAmount,
    currency: voucher.currency,
    status: voucher.status,
    expiresAt: toDateTimeLocalValue(voucher.expiresAt)
  };
}

export function BackofficeOperationsPageClient() {
  const [code, setCode] = useState("");
  const [date, setDate] = useState("");
  const [state, setState] = useState<OperationsState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [flights, setFlights] = useState<BackofficeOperationsFlightItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, BackofficeOperationsUpdateInput>>({});
  const [pendingFlightAction, setPendingFlightAction] = useState<string | null>(null);
  // Danh sách chuyến bay đang mở chi tiết (collapsible)
  const [expandedFlightIds, setExpandedFlightIds] = useState<Set<number>>(new Set());
  const [flightForm, setFlightForm] = useState<BackofficeOperationsFlightCreateInput>(createEmptyFlightForm);

  const [voucherState, setVoucherState] = useState<OperationsState>("idle");
  const [voucherErrorMessage, setVoucherErrorMessage] = useState<string | null>(null);
  const [voucherEmail, setVoucherEmail] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherStatus, setVoucherStatus] = useState("ALL");
  const [vouchers, setVouchers] = useState<BackofficeVoucherItem[]>([]);
  const [voucherForm, setVoucherForm] = useState<BackofficeVoucherCreateInput>(createEmptyVoucherForm);
  const [voucherDrafts, setVoucherDrafts] = useState<Record<number, BackofficeVoucherUpdateInput>>({});
  const [pendingVoucherAction, setPendingVoucherAction] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void loadFlightStatus("", "", accessToken);
    void loadVouchers("", "", "ALL", accessToken);
  }, [accessToken]);

  async function loadFlightStatus(nextDate: string, nextCode: string, nextAccessToken: string) {
    setState("loading");
    setErrorMessage(null);

    try {
      const nextFlightStatus = await fetchBackofficeOperationsFlights(nextAccessToken, {
        code: nextCode,
        date: nextDate
      });
      setFlights(nextFlightStatus.flights);
      setDrafts(
        Object.fromEntries(nextFlightStatus.flights.map((flight) => [flight.flightId, buildFlightDraft(flight)]))
      );
      setState("success");
    } catch (error) {
      setFlights([]);
      setDrafts({});
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể tải dữ liệu chuyến bay lúc này."));
      setState("error");
    }
  }

  async function loadVouchers(
    nextEmail: string,
    nextCode: string,
    nextStatus: string,
    nextAccessToken: string
  ) {
    setVoucherState("loading");
    setVoucherErrorMessage(null);

    try {
      const payload = await fetchBackofficeOperationsVouchers(nextAccessToken, {
        email: nextEmail,
        code: nextCode,
        status: nextStatus === "ALL" ? null : nextStatus
      });
      setVouchers(payload.vouchers);
      setVoucherDrafts(
        Object.fromEntries(payload.vouchers.map((voucher) => [voucher.voucherId, buildVoucherDraft(voucher)]))
      );
      setVoucherState("success");
    } catch (error) {
      setVouchers([]);
      setVoucherDrafts({});
      setVoucherErrorMessage(resolveApiClientErrorMessage(error, "Không thể tải danh sách voucher vận hành lúc này."));
      setVoucherState("error");
    }
  }

  function updateFlightFormField<TKey extends keyof BackofficeOperationsFlightCreateInput>(
    key: TKey,
    value: BackofficeOperationsFlightCreateInput[TKey]
  ) {
    setFlightForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || pendingFlightAction !== null) {
      return;
    }
    await loadFlightStatus(date, code.trim().toUpperCase(), accessToken);
  }

  async function handleCreateFlight() {
    if (!accessToken || pendingFlightAction !== null) {
      return;
    }

    setPendingFlightAction("create-flight");
    setErrorMessage(null);
    try {
      await createBackofficeOperationsFlight(
        {
          ...flightForm,
          code: flightForm.code.trim().toUpperCase(),
          originCode: flightForm.originCode.trim().toUpperCase(),
          destinationCode: flightForm.destinationCode.trim().toUpperCase(),
          gate: flightForm.gate.trim().toUpperCase(),
          note: flightForm.note.trim(),
          departureAt: toApiDateTimeValue(flightForm.departureAt),
          arrivalAt: toApiDateTimeValue(flightForm.arrivalAt),
          baseFare: Number(flightForm.baseFare)
        },
        accessToken
      );
      setFlightForm(createEmptyFlightForm());
      await loadFlightStatus(date, code.trim().toUpperCase(), accessToken);
      pushToast({
        title: "Đã tạo chuyến bay",
        message: "Chuyến bay mới đã được thêm vào danh sách vận hành.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể tạo chuyến bay mới lúc này."));
    } finally {
      setPendingFlightAction(null);
    }
  }

  async function handleSaveFlight(flightId: number) {
    if (!accessToken || pendingFlightAction !== null) {
      return;
    }
    const draft = drafts[flightId];
    if (!draft) {
      return;
    }

    setPendingFlightAction(`save-flight-${flightId}`);
    setErrorMessage(null);
    try {
      await updateBackofficeOperationsFlight(flightId, draft, accessToken);
      await loadFlightStatus(date, code.trim().toUpperCase(), accessToken);
      pushToast({
        title: "Đã cập nhật chuyến bay",
        message: "Trạng thái, cổng và ghi chú vận hành đã được lưu.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể cập nhật chuyến bay lúc này."));
    } finally {
      setPendingFlightAction(null);
    }
  }

  async function handleCancelFlight(flight: BackofficeOperationsFlightItem) {
    if (!accessToken || pendingFlightAction !== null) {
      return;
    }

    const shouldCancelFlight = window.confirm(
      `Hủy chuyến ${flight.code} sẽ cập nhật booking, vé liên quan và gửi email thông báo cho khách. Bạn có muốn tiếp tục?`
    );

    if (!shouldCancelFlight) {
      return;
    }

    setPendingFlightAction(`cancel-flight-${flight.flightId}`);
    setErrorMessage(null);
    try {
      await cancelBackofficeOperationsFlight(flight.flightId, accessToken);
      await loadFlightStatus(date, code.trim().toUpperCase(), accessToken);
      pushToast({
        title: "Đã hủy chuyến bay",
        message: "Hệ thống đã đồng bộ trạng thái chuyến, booking và email thông báo.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể hủy chuyến bay lúc này."));
    } finally {
      setPendingFlightAction(null);
    }
  }

  async function handleHideCancelledFlight(flight: BackofficeOperationsFlightItem) {
    if (!accessToken || pendingFlightAction !== null) {
      return;
    }

    const shouldHideFlight = window.confirm(
      `Ẩn chuyến ${flight.code} khỏi giao diện vận hành và khu công khai? Dữ liệu lịch sử vẫn được giữ lại.`
    );

    if (!shouldHideFlight) {
      return;
    }

    setPendingFlightAction(`hide-flight-${flight.flightId}`);
    setErrorMessage(null);
    try {
      await hideCancelledBackofficeOperationsFlight(flight.flightId, accessToken);
      await loadFlightStatus(date, code.trim().toUpperCase(), accessToken);
      pushToast({
        title: "Đã ẩn chuyến bay đã hủy",
        message: "Chuyến bay đã hủy không còn hiển thị trên giao diện vận hành.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể ẩn chuyến bay đã hủy lúc này."));
    } finally {
      setPendingFlightAction(null);
    }
  }

  async function handleVoucherFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || pendingVoucherAction !== null) {
      return;
    }
    await loadVouchers(voucherEmail.trim(), voucherCode.trim().toUpperCase(), voucherStatus, accessToken);
  }

  async function handleVoucherCreate() {
    if (!accessToken || pendingVoucherAction !== null) {
      return;
    }

    setPendingVoucherAction("create-voucher");
    setVoucherErrorMessage(null);
    try {
      await createBackofficeOperationsVoucher(
        {
          ...voucherForm,
          memberEmail: voucherForm.memberEmail.trim(),
          voucherCode: voucherForm.voucherCode.trim().toUpperCase(),
          title: voucherForm.title.trim(),
          description: voucherForm.description.trim(),
          currency: voucherForm.currency.trim().toUpperCase(),
          expiresAt: toApiDateTimeValue(voucherForm.expiresAt)
        },
        accessToken
      );
      await loadVouchers(voucherEmail.trim(), voucherCode.trim().toUpperCase(), voucherStatus, accessToken);
      setVoucherForm(createEmptyVoucherForm());
      pushToast({
        title: "Đã cấp voucher",
        message: "Voucher mới đã được cấp cho hội viên.",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(resolveApiClientErrorMessage(error, "Không thể cấp voucher lúc này."));
    } finally {
      setPendingVoucherAction(null);
    }
  }

  async function handleVoucherSave(voucherId: number) {
    if (!accessToken || pendingVoucherAction !== null) {
      return;
    }
    const draft = voucherDrafts[voucherId];
    if (!draft) {
      return;
    }

    setPendingVoucherAction(`save-voucher-${voucherId}`);
    setVoucherErrorMessage(null);
    try {
      await updateBackofficeOperationsVoucher(
        voucherId,
        {
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim(),
          currency: draft.currency.trim().toUpperCase(),
          expiresAt: toApiDateTimeValue(draft.expiresAt)
        },
        accessToken
      );
      await loadVouchers(voucherEmail.trim(), voucherCode.trim().toUpperCase(), voucherStatus, accessToken);
      pushToast({
        title: "Đã cập nhật voucher",
        message: "Thông tin voucher vận hành đã được lưu.",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(resolveApiClientErrorMessage(error, "Không thể cập nhật voucher lúc này."));
    } finally {
      setPendingVoucherAction(null);
    }
  }

  async function handleVoucherRevoke(voucherId: number) {
    if (!accessToken || pendingVoucherAction !== null) {
      return;
    }

    setPendingVoucherAction(`revoke-voucher-${voucherId}`);
    setVoucherErrorMessage(null);
    try {
      await revokeBackofficeOperationsVoucher(voucherId, accessToken);
      await loadVouchers(voucherEmail.trim(), voucherCode.trim().toUpperCase(), voucherStatus, accessToken);
      pushToast({
        title: "Đã thu hồi voucher",
        message: "Voucher đã được chuyển về trạng thái thu hồi an toàn.",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(resolveApiClientErrorMessage(error, "Không thể thu hồi voucher lúc này."));
    } finally {
      setPendingVoucherAction(null);
    }
  }

  async function handleVoucherHide(voucher: BackofficeVoucherItem) {
    if (!accessToken || pendingVoucherAction !== null) {
      return;
    }

    const actionLabel = voucher.status === "REVOKED" ? "ẩn voucher đã thu hồi" : "xóa lịch sử voucher đã dùng";
    const shouldHide = window.confirm(`Bạn có chắc muốn ${actionLabel} này khỏi giao diện vận hành?`);
    if (!shouldHide) {
      return;
    }

    setPendingVoucherAction(`hide-voucher-${voucher.voucherId}`);
    setVoucherErrorMessage(null);
    try {
      await hideBackofficeOperationsVoucher(voucher.voucherId, accessToken);
      await loadVouchers(voucherEmail.trim(), voucherCode.trim().toUpperCase(), voucherStatus, accessToken);
      pushToast({
        title: voucher.status === "REVOKED" ? "Đã ẩn voucher thu hồi" : "Đã xóa lịch sử voucher",
        message:
          voucher.status === "REVOKED"
            ? "Voucher thu hồi đã được ẩn khỏi danh sách vận hành."
            : "Voucher đã dùng đã được ẩn khỏi danh sách vận hành.",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(resolveApiClientErrorMessage(error, "Không thể ẩn voucher khỏi danh sách vận hành."));
    } finally {
      setPendingVoucherAction(null);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice điều hành"
          title="Vận hành chuyến bay, trạng thái bán và voucher hội viên"
          description="Nhóm operations có thể tạo chuyến, hủy chuyến, ẩn chuyến đã hủy, đồng thời cấp và quản lý voucher đúng theo quy trình vận hành."
        />

        {errorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể xử lý chuyến bay</strong>
            <p>{errorMessage}</p>
          </article>
        ) : null}

        <div className="section-split">
          <article className="surface-card">
            <SectionHeading
              eyebrow="Tạo chuyến mới"
              title="Bổ sung chuyến bay vào hệ thống khai thác"
              description="Nhập mã chuyến, sân bay đi đến, thời gian và giá gốc Phổ thông tiết kiệm. Hệ thống sẽ tự suy ra 3 hạng vé cố định."
            />
            <div className="field-grid compact-grid">
              <label className="field">
                <span>Mã chuyến bay</span>
                <input
                  value={flightForm.code}
                  onChange={(event) => updateFlightFormField("code", event.target.value)}
                  placeholder="Ví dụ: VN6201"
                />
              </label>
              <label className="field">
                <span>Sân bay đi</span>
                <input
                  value={flightForm.originCode}
                  onChange={(event) => updateFlightFormField("originCode", event.target.value)}
                  placeholder="Ví dụ: SGN"
                />
              </label>
              <label className="field">
                <span>Sân bay đến</span>
                <input
                  value={flightForm.destinationCode}
                  onChange={(event) => updateFlightFormField("destinationCode", event.target.value)}
                  placeholder="Ví dụ: HAN"
                />
              </label>
              <label className="field">
                <span>Giờ cất cánh</span>
                <input
                  type="datetime-local"
                  value={flightForm.departureAt}
                  onChange={(event) => updateFlightFormField("departureAt", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Giờ hạ cánh</span>
                <input
                  type="datetime-local"
                  value={flightForm.arrivalAt}
                  onChange={(event) => updateFlightFormField("arrivalAt", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Cửa ra tàu</span>
                <input
                  value={flightForm.gate}
                  onChange={(event) => updateFlightFormField("gate", event.target.value)}
                  placeholder="Ví dụ: G8"
                />
              </label>
              <label className="field">
                <span>Giá gốc Phổ thông tiết kiệm</span>
                <input
                  type="number"
                  min={1}
                  value={flightForm.baseFare}
                  onChange={(event) =>
                    updateFlightFormField("baseFare", capNhatGiaGocHopLe(event.target.value, flightForm.baseFare))
                  }
                />
              </label>
              <label className="field result-grid-span-full">
                <span>Ghi chú vận hành</span>
                <textarea
                  className="booking-textarea"
                  rows={2}
                  value={flightForm.note}
                  onChange={(event) => updateFlightFormField("note", event.target.value)}
                  placeholder="Ví dụ: Chuyến bổ sung cuối tuần."
                />
              </label>
            </div>

            <div className="booking-action-list">
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={flightForm.salesOpen}
                  onChange={(event) => updateFlightFormField("salesOpen", event.target.checked)}
                />
                <span>Mở bán ngay sau khi tạo chuyến</span>
              </label>

              <div className="stack-list">
                {taoDanhSachHangVeCoDinh(flightForm.baseFare).map((fareInventory) => (
                  <article
                    key={fareInventory.fareFamily}
                    className={`surface-card admin-nested-card ${layLopMauGoiGia(fareInventory.fareFamily)}`}
                  >
                    <div className="field-grid compact-grid">
                      <label className="field">
                        <span>Hạng vé cố định</span>
                        <input value={fareInventory.title} disabled />
                      </label>
                      <label className="field">
                        <span>Số ghế cố định</span>
                        <input value={fareInventory.totalSeats} disabled />
                      </label>
                      <label className="field">
                        <span>Vùng ghế</span>
                        <input value={`Hàng ${fareInventory.rowStart}-${fareInventory.rowEnd}`} disabled />
                      </label>
                      <label className="field">
                        <span>Giá vé</span>
                        <input value={formatCurrency(fareInventory.price)} disabled />
                      </label>
                    </div>
                  </article>
                ))}
              </div>

              <small className="finance-muted-action operations-fare-note">
                Quota và vùng ghế của 3 hạng vé được cố định trong hệ thống để đồng bộ với giao diện đặt vé của hành khách.
              </small>

              <button
                type="button"
                className="button button-primary"
                onClick={() => void handleCreateFlight()}
                disabled={pendingFlightAction !== null}
              >
                {pendingFlightAction === "create-flight" ? "Đang tạo chuyến bay..." : "Tạo chuyến bay mới"}
              </button>
            </div>
          </article>

          <article className="surface-card">
            <SectionHeading
              eyebrow="Tra cứu vận hành"
              title="Lọc chuyến bay theo mã hoặc ngày"
              description="Dùng bộ lọc này để mở nhanh từng chuyến và thực hiện thao tác cập nhật, hủy hoặc ẩn chuyến đã hủy."
            />
            <form className="stack-list" onSubmit={handleSubmit}>
              <div className="field-grid compact-grid">
                <label className="field">
                  <span>Mã chuyến bay</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Ví dụ: VN5201"
                  />
                </label>
                <label className="field">
                  <span>Ngày bay</span>
                  <input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
                </label>
              </div>
              <div className="booking-action-list">
                <button type="submit" className="button button-secondary" disabled={state === "loading" || pendingFlightAction !== null}>
                  {state === "loading" ? "Đang tải..." : "Tải danh sách chuyến bay"}
                </button>
              </div>
            </form>
          </article>
        </div>

        <div className="section-gap" />
        <div className="stack-list">
          {flights.length > 0 ? (
            flights.map((flight) => {
              const draft = drafts[flight.flightId];
              const isWorking = pendingFlightAction?.endsWith(`-${flight.flightId}`) ?? false;
              const isExpanded = expandedFlightIds.has(flight.flightId);
              const statusOptions =
                flight.status === "cancelled"
                  ? STATUS_OPTIONS.filter((option) => option.value === "cancelled")
                  : FLIGHT_UPDATE_STATUS_OPTIONS;
              return (
                <article key={flight.flightId} className="surface-card result-card">
                  {/* Thanh tóm tắt — nhấn để mở/đóng chi tiết */}
                  <button
                    type="button"
                    className="operations-flight-toggle"
                    onClick={() =>
                      setExpandedFlightIds((current) => {
                        const next = new Set(current);
                        if (next.has(flight.flightId)) {
                          next.delete(flight.flightId);
                        } else {
                          next.add(flight.flightId);
                        }
                        return next;
                      })
                    }
                    aria-expanded={isExpanded}
                  >
                    <span className="operations-flight-toggle-icon" aria-hidden="true">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span className="operations-flight-toggle-code">{flight.code}</span>
                    <span className="operations-flight-toggle-route">
                      {flight.from} → {flight.to}
                    </span>
                    <span className="operations-flight-toggle-time">
                      {formatDateTime(flight.departureAt)}
                    </span>
                    <StatusChip tone={toneMap[flight.status as keyof typeof toneMap]} label={flight.statusLabel} />
                  </button>

                  {/* Chi tiết chuyến bay — chỉ hiện khi mở */}
                  {isExpanded ? (
                    <>
                      <div className="result-grid result-grid-rich">
                        <div>
                          <span>Khởi hành</span>
                          <strong>{formatDateTime(flight.departureAt)}</strong>
                        </div>
                        <div>
                          <span>Hạ cánh</span>
                          <strong>{formatDateTime(flight.arrivalAt)}</strong>
                        </div>
                        <div>
                          <span>Cửa ra tàu hiện tại</span>
                          <strong>{flight.gate}</strong>
                        </div>
                        <div>
                          <span>Giá gốc hiện tại</span>
                          <strong>{formatCurrency(flight.baseFare)}</strong>
                        </div>
                      </div>

                      <div className="field-grid compact-grid">
                        <label className="field">
                          <span>Trạng thái</span>
                          <select
                            value={draft?.status ?? flight.status}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [flight.flightId]: {
                                  ...(draft ?? buildFlightDraft(flight)),
                                  status: event.target.value
                                }
                              }))
                            }
                            disabled={isWorking}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span>Cửa ra tàu</span>
                          <input
                            value={draft?.gate ?? flight.gate}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [flight.flightId]: {
                                  ...(draft ?? buildFlightDraft(flight)),
                                  gate: event.target.value
                                }
                              }))
                            }
                            disabled={isWorking}
                          />
                        </label>
                        <label className="field">
                          <span>Giá gốc Phổ thông tiết kiệm</span>
                          <input
                            type="number"
                            min={1}
                            value={draft?.baseFare ?? flight.baseFare}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [flight.flightId]: {
                                  ...(draft ?? buildFlightDraft(flight)),
                                  baseFare: capNhatGiaGocHopLe(event.target.value, draft?.baseFare ?? flight.baseFare)
                                }
                              }))
                            }
                            disabled={isWorking}
                          />
                        </label>

                        <label className="field result-grid-span-full">
                          <span>Ghi chú vận hành</span>
                          <textarea
                            className="booking-textarea"
                            rows={3}
                            value={draft?.note ?? flight.note}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [flight.flightId]: {
                                  ...(draft ?? buildFlightDraft(flight)),
                                  note: event.target.value
                                }
                              }))
                            }
                            disabled={isWorking}
                          />
                        </label>
                      </div>

                      <div className="stack-list">
                        {flight.fareSummaries.map((fareSummary) => (
                          <article
                            key={`${flight.flightId}-${fareSummary.fareFamily}`}
                            className={`surface-card admin-nested-card ${layLopMauGoiGia(fareSummary.fareFamily)}`}
                          >
                            <div className="field-grid compact-grid">
                              <label className="field">
                                <span>Hạng vé</span>
                                <input value={fareSummary.title} disabled />
                              </label>
                              <label className="field">
                                <span>Số ghế cố định</span>
                                <input value={fareSummary.totalSeats} disabled />
                              </label>
                              <label className="field">
                                <span>Vùng ghế</span>
                                <input value={`Hàng ${fareSummary.rowStart}-${fareSummary.rowEnd}`} disabled />
                              </label>
                              <label className="field">
                                <span>Giá đang bán</span>
                                <input value={formatCurrency(fareSummary.price)} disabled />
                              </label>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="booking-action-list">
                        <label className="field-checkbox">
                          <input
                            type="checkbox"
                            checked={draft?.salesOpen ?? flight.salesOpen}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [flight.flightId]: {
                                  ...(draft ?? buildFlightDraft(flight)),
                                  salesOpen: event.target.checked
                                }
                              }))
                            }
                            disabled={isWorking || flight.status === "cancelled"}
                          />
                          <span>Cho phép tiếp tục mở bán trên chuyến này</span>
                        </label>
                        <div className="finance-action-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => void handleSaveFlight(flight.flightId)}
                            disabled={isWorking || pendingFlightAction !== null}
                          >
                            {pendingFlightAction === `save-flight-${flight.flightId}`
                              ? "Đang lưu..."
                              : "Lưu thay đổi vận hành"}
                          </button>
                          {flight.status === "cancelled" ? (
                            <button
                              type="button"
                              className="button button-primary"
                              onClick={() => void handleHideCancelledFlight(flight)}
                              disabled={isWorking || pendingFlightAction !== null}
                            >
                              {pendingFlightAction === `hide-flight-${flight.flightId}`
                                ? "Đang ẩn..."
                                : "Ẩn chuyến đã hủy"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button button-primary"
                              onClick={() => void handleCancelFlight(flight)}
                              disabled={isWorking || pendingFlightAction !== null}
                            >
                              {pendingFlightAction === `cancel-flight-${flight.flightId}`
                                ? "Đang hủy chuyến..."
                                : "Hủy chuyến bay"}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </article>
              );
            })
          ) : (
            <article className="surface-card">
              <span className="section-eyebrow">{state === "loading" ? "Đang tải" : "Không có kết quả"}</span>
              <h3>{state === "loading" ? "Đang tải dữ liệu chuyến bay" : "Không có chuyến bay phù hợp"}</h3>
              <p>
                {state === "loading"
                  ? "Vui lòng chờ trong giây lát để tải dữ liệu khai thác."
                  : "Kiểm tra lại ngày bay hoặc mã chuyến bay để tiếp tục tra cứu."}
              </p>
            </article>
          )}
        </div>

        <div className="section-gap" />
        <SectionHeading
          eyebrow="Voucher vận hành"
          title="Cấp, chỉnh sửa, thu hồi và dọn lịch sử voucher"
          description="Voucher đã dùng chỉ ẩn khỏi màn operations khi bạn dọn lịch sử, còn hội viên tự quyết định xóa lịch sử bên phía tài khoản của họ."
        />

        {voucherErrorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể xử lý voucher</strong>
            <p>{voucherErrorMessage}</p>
          </article>
        ) : null}

        <div className="section-split">
          <article className="surface-card">
            <SectionHeading
              eyebrow="Tạo voucher mới"
              title="Cấp voucher trực tiếp cho hội viên"
              description="Chỉ cấp cho tài khoản đang là hội viên. Mỗi voucher được theo dõi tới khi dùng hoặc thu hồi."
            />
            <div className="field-grid compact-grid">
              <label className="field">
                <span>Email hội viên</span>
                <input
                  value={voucherForm.memberEmail}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      memberEmail: event.target.value
                    }))
                  }
                  placeholder="hoi.vien@gmail.com"
                />
              </label>
              <label className="field">
                <span>Mã voucher</span>
                <input
                  value={voucherForm.voucherCode}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      voucherCode: event.target.value.toUpperCase()
                    }))
                  }
                  placeholder="Ví dụ: OPS52026"
                />
              </label>
              <label className="field">
                <span>Giảm giá</span>
                <input
                  type="number"
                  min={1}
                  value={voucherForm.discountAmount}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      discountAmount: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="field result-grid-span-full">
                <span>Tiêu đề</span>
                <input
                  value={voucherForm.title}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field result-grid-span-full">
                <span>Mô tả</span>
                <textarea
                  className="booking-textarea"
                  rows={3}
                  value={voucherForm.description}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Tiền tệ</span>
                <input
                  value={voucherForm.currency}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase()
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Hết hạn lúc</span>
                <input
                  type="datetime-local"
                  value={voucherForm.expiresAt}
                  onChange={(event) =>
                    setVoucherForm((current) => ({
                      ...current,
                      expiresAt: event.target.value
                    }))
                  }
                />
              </label>
            </div>
            <div className="booking-action-list booking-action-list-spacious">
              <button
                type="button"
                className="button button-primary"
                onClick={() => void handleVoucherCreate()}
                disabled={pendingVoucherAction !== null}
              >
                {pendingVoucherAction === "create-voucher" ? "Đang tạo voucher..." : "Cấp voucher cho hội viên"}
              </button>
            </div>
          </article>

          <article className="surface-card">
            <SectionHeading
              eyebrow="Tra cứu voucher"
              title="Lọc nhanh theo hội viên, mã hoặc trạng thái"
              description="Dùng để tìm voucher khả dụng, đang giữ chỗ, đã dùng hoặc đã thu hồi."
            />
            <form className="stack-list" onSubmit={handleVoucherFilterSubmit}>
              <div className="field-grid compact-grid">
                <label className="field">
                  <span>Email hội viên</span>
                  <input
                    value={voucherEmail}
                    onChange={(event) => setVoucherEmail(event.target.value)}
                    placeholder="hoi.vien@gmail.com"
                  />
                </label>
                <label className="field">
                  <span>Mã voucher</span>
                  <input
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                    placeholder="Ví dụ: OPS52026"
                  />
                </label>
                <label className="field">
                  <span>Trạng thái</span>
                  <select value={voucherStatus} onChange={(event) => setVoucherStatus(event.target.value)}>
                    {VOUCHER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="booking-action-list">
                <button type="submit" className="button button-secondary" disabled={voucherState === "loading"}>
                  {voucherState === "loading" ? "Đang tải voucher..." : "Tải danh sách voucher"}
                </button>
              </div>
            </form>
          </article>
        </div>

        <div className="section-gap" />
        <div className="stack-list">
          {vouchers.length > 0 ? (
            vouchers.map((voucher) => {
              const draft = voucherDrafts[voucher.voucherId];
              const isWorking = pendingVoucherAction?.endsWith(`-${voucher.voucherId}`) ?? false;
              const isUsedVoucher = voucher.status === "USED";
              const isReservedVoucher = voucher.status === "RESERVED";
              const isRevokedVoucher = voucher.status === "REVOKED";
              const canHideVoucher = isUsedVoucher || isRevokedVoucher;
              const isEditableVoucher = !isUsedVoucher && !isReservedVoucher;

              return (
                <article key={voucher.voucherId} className="surface-card result-card">
                  <div className="result-top">
                    <div>
                      <span className="section-eyebrow">Voucher {voucher.voucherCode}</span>
                      <h3>{voucher.title}</h3>
                      <p>
                        {voucher.memberDisplayName} · {voucher.memberEmail}
                      </p>
                    </div>
                    <StatusChip tone={resolveVoucherTone(voucher.status)} label={formatVoucherStatus(voucher.status)} />
                  </div>

                  <div className="result-grid result-grid-rich">
                    <div>
                      <span>Giảm giá</span>
                      <strong>{formatCurrency(voucher.discountAmount, voucher.currency)}</strong>
                    </div>
                    <div>
                      <span>Hết hạn</span>
                      <strong>{formatDateTime(voucher.expiresAt)}</strong>
                    </div>
                    <div>
                      <span>Booking liên kết</span>
                      <strong>{voucher.bookingCode ?? "Chưa liên kết"}</strong>
                    </div>
                  </div>

                  <div className="field-grid compact-grid">
                    <label className="field result-grid-span-full">
                      <span>Tiêu đề</span>
                      <input
                        value={draft?.title ?? voucher.title}
                        onChange={(event) =>
                          setVoucherDrafts((current) => ({
                            ...current,
                            [voucher.voucherId]: {
                              ...(draft ?? buildVoucherDraft(voucher)),
                              title: event.target.value
                            }
                          }))
                        }
                        disabled={isWorking || !isEditableVoucher}
                      />
                    </label>
                    <label className="field result-grid-span-full">
                      <span>Mô tả</span>
                      <textarea
                        className="booking-textarea"
                        rows={3}
                        value={draft?.description ?? voucher.description}
                        onChange={(event) =>
                          setVoucherDrafts((current) => ({
                            ...current,
                            [voucher.voucherId]: {
                              ...(draft ?? buildVoucherDraft(voucher)),
                              description: event.target.value
                            }
                          }))
                        }
                        disabled={isWorking || !isEditableVoucher}
                      />
                    </label>
                    <label className="field">
                      <span>Giảm giá</span>
                      <input
                        type="number"
                        min={1}
                        value={draft?.discountAmount ?? voucher.discountAmount}
                        onChange={(event) =>
                          setVoucherDrafts((current) => ({
                            ...current,
                            [voucher.voucherId]: {
                              ...(draft ?? buildVoucherDraft(voucher)),
                              discountAmount: Number(event.target.value)
                            }
                          }))
                        }
                        disabled={isWorking || !isEditableVoucher}
                      />
                    </label>
                    <label className="field">
                      <span>Tiền tệ</span>
                      <input
                        value={draft?.currency ?? voucher.currency}
                        onChange={(event) =>
                          setVoucherDrafts((current) => ({
                            ...current,
                            [voucher.voucherId]: {
                              ...(draft ?? buildVoucherDraft(voucher)),
                              currency: event.target.value.toUpperCase()
                            }
                          }))
                        }
                        disabled={isWorking || !isEditableVoucher}
                      />
                    </label>
                    <label className="field">
                      <span>{isEditableVoucher ? "Trạng thái đích" : "Trạng thái hiện tại"}</span>
                      {isEditableVoucher ? (
                        <select
                          value={draft?.status ?? voucher.status}
                          onChange={(event) =>
                            setVoucherDrafts((current) => ({
                              ...current,
                              [voucher.voucherId]: {
                                ...(draft ?? buildVoucherDraft(voucher)),
                                status: event.target.value
                              }
                            }))
                          }
                          disabled={isWorking}
                        >
                          {VOUCHER_EDITABLE_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input value={formatVoucherStatus(voucher.status)} disabled />
                      )}
                    </label>
                    <label className="field">
                      <span>Hết hạn lúc</span>
                      <input
                        type="datetime-local"
                        value={draft?.expiresAt ?? toDateTimeLocalValue(voucher.expiresAt)}
                        onChange={(event) =>
                          setVoucherDrafts((current) => ({
                            ...current,
                            [voucher.voucherId]: {
                              ...(draft ?? buildVoucherDraft(voucher)),
                              expiresAt: event.target.value
                            }
                          }))
                        }
                        disabled={isWorking || !isEditableVoucher}
                      />
                    </label>
                  </div>

                  <div className="booking-action-list">
                    <div className="result-grid result-grid-rich">
                      <div>
                        <span>Trạng thái hiện tại</span>
                        <strong>{formatVoucherStatus(voucher.status)}</strong>
                      </div>
                      <div>
                        <span>Đã dùng lúc</span>
                        <strong>{voucher.usedAt ? formatDateTime(voucher.usedAt) : "Chưa sử dụng"}</strong>
                      </div>
                      <div>
                        <span>Ghi chú vận hành</span>
                        <strong>
                          {isUsedVoucher
                            ? "Có thể xóa lịch sử khỏi màn operations, hội viên vẫn tự quản lý lịch sử của họ."
                            : isReservedVoucher
                              ? "Voucher đang giữ chỗ, cần thu hồi rõ ràng trước khi chỉnh sửa."
                              : isRevokedVoucher
                                ? "Voucher đã thu hồi, hội viên không còn thấy trong tài khoản."
                                : "Có thể cập nhật hoặc thu hồi theo chính sách hiện hành."}
                        </strong>
                      </div>
                    </div>
                    <div className="finance-action-row">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => void handleVoucherSave(voucher.voucherId)}
                        disabled={isWorking || !isEditableVoucher}
                      >
                        {pendingVoucherAction === `save-voucher-${voucher.voucherId}`
                          ? "Đang lưu voucher..."
                          : "Lưu chỉnh sửa voucher"}
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => void handleVoucherRevoke(voucher.voucherId)}
                        disabled={isWorking || isUsedVoucher || isRevokedVoucher}
                      >
                        {pendingVoucherAction === `revoke-voucher-${voucher.voucherId}` ? "Đang thu hồi..." : "Thu hồi voucher"}
                      </button>
                      {canHideVoucher ? (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => void handleVoucherHide(voucher)}
                          disabled={isWorking}
                        >
                          {pendingVoucherAction === `hide-voucher-${voucher.voucherId}`
                            ? "Đang xử lý..."
                            : isRevokedVoucher
                              ? "Xóa khỏi danh sách"
                              : "Xóa lịch sử voucher"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="surface-card">
              <span className="section-eyebrow">
                {voucherState === "loading" ? "Đang tải" : "Chưa có voucher"}
              </span>
              <h3>
                {voucherState === "loading" ? "Đang tải dữ liệu voucher" : "Không có voucher phù hợp"}
              </h3>
              <p>
                {voucherState === "loading"
                  ? "Vui lòng chờ trong giây lát để tải dữ liệu voucher vận hành."
                  : "Hãy đổi bộ lọc hoặc tạo voucher mới để bắt đầu theo dõi quyền lợi hội viên."}
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
