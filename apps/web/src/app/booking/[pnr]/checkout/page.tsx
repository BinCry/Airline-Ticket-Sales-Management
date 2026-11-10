"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

import { VoucherConditionSummary } from "@/components/voucher-condition-summary";
import { VoucherOriginSummary, useVoucherPresentationTime } from "@/components/voucher-origin-summary";
import { canOfferVoucher, getEffectiveVoucherStatus, voucherExpiryMillis } from "@/lib/voucher-presentation";
import { HoldCountdown } from "@/components/hold-countdown";
import { SectionHeading } from "@/components/section-heading";
import { Stepper } from "@/components/ui/primitives";
import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  applyVoucherToBooking,
  confirmLocalPayment,
  createPaymentSession,
  removeVoucherFromBooking
} from "@/lib/booking-api";
import { coTheXacNhanThanhToanThuCong } from "@/lib/checkout-payment";
import { formatCurrency, formatDateTime as formatDateTimeText } from "@/lib/format";
import { fetchMyVouchers, type MyVoucher } from "@/lib/my-account-api";
import { pushToast } from "@/lib/toast";

function formatDateTime(value: string) {
  return formatDateTimeText(value);
}

const HOLD_EXPIRED_NOTICE =
  "Thời gian giữ chỗ đã hết. Booking này không còn nhận thanh toán, vui lòng tra cứu lại đặt chỗ hoặc chọn chuyến bay mới.";

function isClosedPaymentStatus(status: string | undefined) {
  return status === "expired" || status === "cancelled" || status === "failed";
}

function isHoldExpiredError(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return (
    error.status === 404 ||
    normalizedMessage.includes("hết hạn") ||
    normalizedMessage.includes("không ở trạng thái chờ thanh toán")
  );
}

function formatVoucherStatus(status: string) {
  if (status === "UNVERIFIED") return "Chưa xác minh hạn dùng";
  if (status === "AVAILABLE") {
    return "Chưa sử dụng";
  }

  if (status === "RESERVED") {
    return "Đang giữ cho booking";
  }

  if (status === "USED") {
    return "Đã sử dụng";
  }

  if (status === "EXPIRED") {
    return "Đã hết hạn";
  }

  return status;
}

function resolveSePayQrBankCode(bankName: string | null | undefined) {
  if (!bankName) {
    return null;
  }

  const normalized = bankName.replaceAll(/[^\p{L}\p{N}]+/gu, "").toUpperCase();
  if (normalized === "BIDV") {
    return "BIDV";
  }
  if (normalized === "MB" || normalized === "MBB" || normalized === "MBBANK") {
    return "MBBank";
  }

  return bankName;
}

function resolveFallbackQrCodeUrl(session: ApiPaymentSessionResponse | null) {
  if (!session) {
    return null;
  }

  if (session.qrCodeUrl) {
    return session.qrCodeUrl;
  }

  if (!session.bankName || !session.accountNumber || !session.referenceCode || session.amount <= 0) {
    return null;
  }

  const qrBankCode = resolveSePayQrBankCode(session.bankName);
  if (!qrBankCode) {
    return null;
  }

  const query = new URLSearchParams({
    acc: session.accountNumber,
    amount: String(session.amount),
    bank: qrBankCode,
    des: session.referenceCode,
    template: "compact"
  });

  return `https://qr.sepay.vn/img?${query.toString()}`;
}

export default function BookingCheckoutPage() {
  const params = useParams<{ pnr: string }>();
  const router = useRouter();
  const [bookingCode, setBookingCode] = useState("");
  const [session, setSession] = useState<ApiPaymentSessionResponse | null>(null);
  const [memberVouchers, setMemberVouchers] = useState<MyVoucher[]>([]);
  const voucherPresentationTime = useVoucherPresentationTime(memberVouchers);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [isRemovingVoucher, setIsRemovingVoucher] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [isMemberSession, setIsMemberSession] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voucherErrorMessage, setVoucherErrorMessage] = useState<string | null>(null);
  const [voucherNotice, setVoucherNotice] = useState<string | null>(null);
  const [voucherListErrorMessage, setVoucherListErrorMessage] = useState<string | null>(null);
  const [holdExpiredMessage, setHoldExpiredMessage] = useState<string | null>(null);
  const [paymentNeedsVerification, setPaymentNeedsVerification] = useState(false);
  const [voucherListConfirmed, setVoucherListConfirmed] = useState(false);
  const paymentGuardRef = useRef({ generation: 0, operation: null as "voucher" | "payment" | null, blocked: false, bookingCode: "" });
  const canPublishSession = useCallback((generation: number) => {
    const guard = paymentGuardRef.current;
    return guard.generation === generation && guard.operation === null && !guard.blocked;
  }, []);
  useEffect(() => () => { paymentGuardRef.current.generation++; }, []);
  const isRefreshingExpiredHoldRef = useRef(false);
  const daChuyenTrangSauThanhToanRef = useRef(false);

  useEffect(() => {
    if (params?.pnr) {
      setBookingCode(params.pnr.trim().toUpperCase());
    }
  }, [params]);

  useEffect(() => {
    const storedSession = loadActiveAuthSession();
    setAccessToken(storedSession?.accessToken);
    setIsMemberSession(storedSession?.user.roles.includes("member") ?? false);
  }, []);

  useEffect(() => {
    if (!bookingCode) {
      return;
    }

    const guard = paymentGuardRef.current;
    if (guard.bookingCode !== bookingCode) {
      guard.generation++; guard.bookingCode = bookingCode; guard.operation = null; guard.blocked = false;
      setSession(null); setPaymentNeedsVerification(false); setVoucherListConfirmed(false);
      setIsApplyingVoucher(false); setIsRemovingVoucher(false); setIsPaying(false);
      setVoucherListErrorMessage(null);
    }
    if (guard.operation || guard.blocked) return;
    const generation = ++guard.generation;
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      setErrorMessage(null);
      setHoldExpiredMessage(null);

      try {
        const nextSession = await createPaymentSession(bookingCode, accessToken);
        if (!isMounted || !canPublishSession(generation)) {
          return;
        }
        setSession(nextSession);
        setHoldExpiredMessage(
          isClosedPaymentStatus(nextSession.paymentStatus) ? HOLD_EXPIRED_NOTICE : null
        );
      } catch (error) {
        if (!isMounted || !canPublishSession(generation)) {
          return;
        }
        setSession(null);
        const resolvedMessage = resolveApiClientErrorMessage(
          error,
          "Không thể chuẩn bị thông tin thanh toán."
        );
        setErrorMessage(isHoldExpiredError(error) ? HOLD_EXPIRED_NOTICE : resolvedMessage);
        setHoldExpiredMessage(isHoldExpiredError(error) ? HOLD_EXPIRED_NOTICE : null);
      } finally {
        if (isMounted && canPublishSession(generation)) {
          setIsLoading(false);
        }
      }
    }

    void initSession();

    return () => {
      isMounted = false;
    };
  }, [accessToken, bookingCode, canPublishSession]);

  useEffect(() => {
    if (!bookingCode || !session || session.paymentStatus === "paid" || holdExpiredMessage || isApplyingVoucher || isRemovingVoucher || isPaying || paymentNeedsVerification) {
      return;
    }

    let isMounted = true;
    const intervalId = window.setInterval(() => {
      const generation = paymentGuardRef.current.generation;
      if (!canPublishSession(generation)) return;
      void createPaymentSession(bookingCode, accessToken)
        .then((nextSession) => {
          if (!isMounted || !canPublishSession(generation)) {
            return;
          }
          setSession(nextSession);
          if (isClosedPaymentStatus(nextSession.paymentStatus)) {
            setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
          }
        })
        .catch((error) => {
          if (isMounted && canPublishSession(generation) && isHoldExpiredError(error)) {
            setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
          }
        });
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [accessToken, bookingCode, holdExpiredMessage, session, isApplyingVoucher, isRemovingVoucher, isPaying, paymentNeedsVerification, canPublishSession]);

  useEffect(() => {
    if (!accessToken || !isMemberSession) {
      setMemberVouchers([]);
      setVoucherErrorMessage(null);
      return;
    }

    const memberAccessToken = accessToken;
    const generation = paymentGuardRef.current.generation;
    let isMounted = true;

    async function loadMemberVouchers() {
      setIsLoadingVouchers(true);
      setVoucherListConfirmed(false);
      setVoucherListErrorMessage(null);

      try {
        const nextVouchers = await fetchMyVouchers(memberAccessToken);
        if (!isMounted || !canPublishSession(generation)) {
          return;
        }
        setMemberVouchers(nextVouchers);
        setVoucherListConfirmed(true);
      } catch (error) {
        if (!isMounted || !canPublishSession(generation)) {
          return;
        }
        setMemberVouchers([]);
        setVoucherListErrorMessage(
          resolveApiClientErrorMessage(error, "Không thể tải danh sách voucher lúc này.")
        );
      } finally {
        if (isMounted && canPublishSession(generation)) {
          setIsLoadingVouchers(false);
        }
      }
    }

    void loadMemberVouchers();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isMemberSession, canPublishSession]);

  useEffect(() => {
    if (session?.appliedVoucherCode) {
      setVoucherCode(session.appliedVoucherCode);
    }
  }, [session?.appliedVoucherCode]);

  useEffect(() => {
    if (!bookingCode) {
      daChuyenTrangSauThanhToanRef.current = false;
      return;
    }

    if (session?.paymentStatus !== "paid" || daChuyenTrangSauThanhToanRef.current) {
      return;
    }

    daChuyenTrangSauThanhToanRef.current = true;
    router.replace(`/manage-booking?bookingCode=${encodeURIComponent(bookingCode)}`);
  }, [bookingCode, router, session?.paymentStatus]);

  const handleHoldCountdownExpired = useCallback(async () => {
    const generation = paymentGuardRef.current.generation;
    if (!bookingCode || isRefreshingExpiredHoldRef.current || !canPublishSession(generation)) {
      return;
    }

    isRefreshingExpiredHoldRef.current = true;
    try {
      const nextSession = await createPaymentSession(bookingCode, accessToken);
      if (!canPublishSession(generation)) return;
      setSession(nextSession);
      if (isClosedPaymentStatus(nextSession.paymentStatus)) {
        setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
      }
    } catch (error) {
      if (!canPublishSession(generation)) return;
      if (isHoldExpiredError(error)) {
        setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
        setVoucherErrorMessage(null);
        return;
      }

      setHoldExpiredMessage(
        "Đồng hồ giữ chỗ đã về 0 nhưng chưa thể xác minh trạng thái mới. Vui lòng tải lại hoặc tra cứu lại mã đặt chỗ trước khi thanh toán."
      );
    } finally {
      isRefreshingExpiredHoldRef.current = false;
    }
  }, [accessToken, bookingCode, canPublishSession]);

  const isUpdatingPayment = isApplyingVoucher || isRemovingVoucher;
  const availableVouchers = (voucherListConfirmed && !paymentNeedsVerification && !isUpdatingPayment ? memberVouchers : []).filter(
    (voucher) => canOfferVoucher(voucher, bookingCode, voucherPresentationTime)
  );
  const isPaymentClosed = Boolean(holdExpiredMessage) || isClosedPaymentStatus(session?.paymentStatus);
  const paymentQrCodeUrl = isPaymentClosed ? null : resolveFallbackQrCodeUrl(session);
  const coTheXacNhanThuCong = !isPaymentClosed && coTheXacNhanThanhToanThuCong(session);
  const isHoldingSession = session?.paymentStatus === "pending" && !isPaymentClosed;
  const voucherActionsDisabled = isLoading || isPaying || isUpdatingPayment || paymentNeedsVerification || isPaymentClosed || session?.paymentStatus !== "pending";

  async function handleLocalPaymentConfirmation() {
    const guard = paymentGuardRef.current;
    if (!bookingCode || isPaying || isPaymentClosed || session?.sessionMode !== "local" || session.paymentStatus !== "pending" || guard.operation || guard.blocked) {
      return;
    }

    const generation = ++guard.generation;
    guard.operation = "payment";
    setIsPaying(true);
    setIsLoadingVouchers(false);
    setErrorMessage(null);

    try {
      await confirmLocalPayment(
        {
          bookingCode,
          result: "success"
        },
        accessToken
      );

      if (generation !== guard.generation) return;
      pushToast({
        message: "Thanh toán thành công.",
        title: "Đã xuất vé",
        tone: "success"
      });

      router.replace(`/manage-booking?bookingCode=${encodeURIComponent(bookingCode)}`);
    } catch (error) {
      if (generation === guard.generation) setErrorMessage(resolveApiClientErrorMessage(error, "Không thể xác nhận thanh toán."));
    } finally {
      if (generation === guard.generation) { guard.operation = null; setIsPaying(false); }
    }
  }

  function handleVoucherFailure(error: unknown, confirmed: boolean, generation: number) {
    const guard = paymentGuardRef.current;
    if (generation !== guard.generation) return;
    guard.blocked = true;
    setSession(null);
    setPaymentNeedsVerification(true);
    setVoucherListConfirmed(false);
    const rejection = !confirmed && error instanceof ApiClientError && error.status === 400
      ? resolveApiClientErrorMessage(error, "Yêu cầu thay đổi voucher bị từ chối.") + " "
      : "";
    setVoucherErrorMessage(confirmed
      ? "Voucher đã được cập nhật, nhưng chưa xác minh được thông tin thanh toán mới. Thông tin thanh toán cũ đã được ẩn. Vui lòng kiểm tra đặt chỗ trước khi tiếp tục."
      : rejection + "Chưa xác minh được kết quả thay đổi voucher. Thông tin thanh toán cũ đã được ẩn. Vui lòng kiểm tra đặt chỗ trước khi tiếp tục.");
  }

  async function refreshVoucherList(generation: number) {
    if (generation !== paymentGuardRef.current.generation) return;
    setIsLoadingVouchers(true);
    setVoucherListErrorMessage(null);
    try {
      const vouchers = await fetchMyVouchers(accessToken!);
      if (generation !== paymentGuardRef.current.generation) return;
      setMemberVouchers(vouchers);
      setVoucherListConfirmed(true);
    } catch {
      if (generation !== paymentGuardRef.current.generation) return;
      setMemberVouchers([]);
      setVoucherListConfirmed(false);
      setVoucherListErrorMessage("Thông tin thanh toán đã cập nhật, nhưng chưa tải lại được danh sách voucher. Vui lòng kiểm tra đặt chỗ để xem trạng thái voucher.");
    } finally {
      if (generation === paymentGuardRef.current.generation) setIsLoadingVouchers(false);
    }
  }

  async function handleApplyVoucher(nextVoucherCode?: string) {
    const normalizedVoucherCode = (nextVoucherCode ?? voucherCode).trim().toUpperCase();
    const guard = paymentGuardRef.current;
    if (!bookingCode || !accessToken || !isMemberSession || !normalizedVoucherCode ||
      !session || voucherActionsDisabled || guard.operation || guard.blocked) return;
    const generation = ++guard.generation;
    guard.operation = "voucher";
    setSession(null);
    setIsLoading(false);
    setIsLoadingVouchers(false);
    setErrorMessage(null);
    setIsApplyingVoucher(true);
    setVoucherErrorMessage(null);
    setVoucherNotice(null);
    let confirmed = false;
    let refreshListAfterSuccess = false;
    setVoucherListErrorMessage(null);
    try {
      const overview = await applyVoucherToBooking(bookingCode, { voucherCode: normalizedVoucherCode }, accessToken);
      if (generation !== guard.generation) return;
      confirmed = true;
      guard.blocked = true;
      setPaymentNeedsVerification(true);
      setVoucherCode(overview.priceSummary.appliedVoucherCode ?? "");
      setMemberVouchers([]);
      setVoucherListConfirmed(false);
      const nextSession = await createPaymentSession(bookingCode, accessToken);
      if (generation !== guard.generation) return;
      setSession(nextSession);
      guard.blocked = false;
      setPaymentNeedsVerification(false);
      if (isClosedPaymentStatus(nextSession.paymentStatus)) setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
      else {
        setVoucherNotice("Đã áp voucher " + (nextSession.appliedVoucherCode ?? normalizedVoucherCode) + " cho booking này.");
        pushToast({ message: "Ưu đãi hội viên đã được cập nhật vào tổng thanh toán.", title: "Đã áp voucher", tone: "success" });
      }
      refreshListAfterSuccess = true;
    } catch (error) {
      handleVoucherFailure(error, confirmed, generation);
    } finally {
      if (generation === guard.generation) {
        guard.operation = null;
        setIsApplyingVoucher(false);
        if (refreshListAfterSuccess) void refreshVoucherList(generation);
      }
    }
  }

  async function handleRemoveVoucher() {
    const guard = paymentGuardRef.current;
    if (!bookingCode || !accessToken || !isMemberSession || !session?.appliedVoucherCode ||
      voucherActionsDisabled || guard.operation || guard.blocked) return;
    const previous = session, generation = ++guard.generation;
    guard.operation = "voucher";
    setSession(null);
    setIsLoading(false);
    setIsLoadingVouchers(false);
    setErrorMessage(null);
    setIsRemovingVoucher(true);
    setVoucherErrorMessage(null);
    setVoucherNotice(null);
    let confirmed = false;
    let refreshListAfterSuccess = false;
    setVoucherListErrorMessage(null);
    try {
      const overview = await removeVoucherFromBooking(bookingCode, accessToken);
      if (generation !== guard.generation) return;
      confirmed = true;
      guard.blocked = true;
      setPaymentNeedsVerification(true);
      setVoucherCode(overview.priceSummary.appliedVoucherCode ?? "");
      setMemberVouchers([]);
      setVoucherListConfirmed(false);
      const nextSession = await createPaymentSession(bookingCode, accessToken);
      if (generation !== guard.generation) return;
      setSession(nextSession);
      guard.blocked = false;
      setPaymentNeedsVerification(false);
      if (isClosedPaymentStatus(nextSession.paymentStatus)) setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
      else {
        setVoucherNotice("Đã bỏ voucher " + previous.appliedVoucherCode + " khỏi booking này.");
        pushToast({ message: "Voucher đã được gỡ khỏi tổng thanh toán.", title: "Đã bỏ voucher", tone: "success" });
      }
      refreshListAfterSuccess = true;
    } catch (error) {
      handleVoucherFailure(error, confirmed, generation);
    } finally {
      if (generation === guard.generation) {
        guard.operation = null;
        setIsRemovingVoucher(false);
        if (refreshListAfterSuccess) void refreshVoucherList(generation);
      }
    }
  }

  return (
    <section className="section">
      {session && isHoldingSession ? (
        <div className="checkout-floating-countdown">
          <HoldCountdown
            expiresAt={session.expiresAt}
            isActive={isHoldingSession}
            onExpire={() => void handleHoldCountdownExpired()}
          />
        </div>
      ) : null}
      <div className="container">
        <div className="page-hero-card booking-flow-hero">
          <div>
            <span className="section-eyebrow">Thanh toán</span>
            <h1 className="page-title">Thanh toán đặt chỗ {bookingCode || "..."}</h1>
            <p className="page-hero-copy">
              Hoàn tất giao dịch để nhận vé và thông tin hành trình qua email.
            </p>
            <div className="booking-flow-progress">
              <Stepper
                current={2}
                items={[
                  { id: "flight", label: "Chuyến bay" },
                  { id: "passenger", label: "Hành khách" },
                  { id: "payment", label: "Thanh toán" }
                ]}
              />
            </div>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Bước thanh toán</span>
            <h3>{isUpdatingPayment ? "Đang cập nhật thanh toán" : paymentNeedsVerification ? "Chưa xác minh thanh toán" : session?.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}</h3>
            <p>
              {session
                ? `Hết hạn lúc ${formatDateTime(session.expiresAt)}`
                : paymentNeedsVerification ? "Vui lòng kiểm tra đặt chỗ trước khi tiếp tục." : "Đang chuẩn bị mã thanh toán cho booking này."}
            </p>
            <strong>
              {session ? formatCurrency(session.amount) : paymentNeedsVerification ? "Chưa xác minh số tiền thanh toán" : "Đang chuẩn bị thông tin thanh toán"}
            </strong>
            {session?.discountAmount ? (
              <small>
                Đã giảm {formatCurrency(session.discountAmount)}
                {session.appliedVoucherCode ? ` bằng voucher ${session.appliedVoucherCode}` : ""}.
              </small>
            ) : null}
          </div>
        </div>

        <div className="section-gap" />
        <div className="section-split booking-flow-layout">
          <div className="stack-list">
            <SectionHeading
              eyebrow="Thanh toán"
              title="Kiểm tra thông tin thanh toán"
              description="Dùng đúng mã thanh toán để SePay xác nhận giao dịch và phát hành vé cho từng hành khách trong mã đặt chỗ."
            />
            <article className="surface-card booking-payment-card">
              {isUpdatingPayment ? (
                <><span className="section-eyebrow">Đang cập nhật</span><h3>Đang xác minh thông tin thanh toán mới...</h3><p>Thông tin thanh toán trước đó đã được tạm ẩn.</p></>
              ) : paymentNeedsVerification ? (
                <div role="alert"><h3>Chưa xác minh được thông tin thanh toán</h3><p>{voucherErrorMessage}</p><Link href={"/manage-booking?bookingCode=" + encodeURIComponent(bookingCode)} className="button button-secondary">Kiểm tra đặt chỗ</Link></div>
              ) : isLoading ? (
                <>
                  <span className="section-eyebrow">Đang tải</span>
                  <h3>Đang chuẩn bị thông tin thanh toán...</h3>
                  <p>Vui lòng chờ trong giây lát để tạo mã thanh toán cho booking này.</p>
                </>
              ) : errorMessage ? (
                <>
                  <span className="section-eyebrow">Không thể tải dữ liệu</span>
                  <h3>Không thể chuẩn bị thông tin thanh toán</h3>
                  <p>{errorMessage}</p>
                </>
              ) : session ? (
                <>
                  <div className="booking-payment-overview">
                    {paymentQrCodeUrl ? (
                      <div className="booking-payment-qr">
                        <img
                          src={paymentQrCodeUrl}
                          alt={`Mã QR thanh toán cho ${session.referenceCode}`}
                        />
                      </div>
                    ) : null}
                    <div className="result-grid booking-payment-detail-list">
                      <div>
                        <span>Mã PNR</span>
                        <strong>{session.bookingCode}</strong>
                      </div>
                      <div>
                        <span>Trạng thái</span>
                        <strong>{session.paymentStatus}</strong>
                      </div>
                      <div>
                        <span>Mã thanh toán</span>
                        <strong>{session.referenceCode}</strong>
                      </div>
                      <div>
                        <span>Hết hạn giữ chỗ</span>
                        <strong>{formatDateTime(session.expiresAt)}</strong>
                      </div>
                      <div>
                        <span>Số tiền</span>
                        <strong>{formatCurrency(session.amount)}</strong>
                      </div>
                      <div>
                        <span>Giảm từ voucher</span>
                        <strong>
                          {session.discountAmount > 0
                            ? formatCurrency(session.discountAmount)
                            : "Chưa áp dụng"}
                        </strong>
                      </div>
                      <div>
                        <span>Ngân hàng nhận</span>
                        <strong>{session.bankName ?? "Chưa cấu hình"}</strong>
                      </div>
                      <div>
                        <span>Số tài khoản</span>
                        <strong>{session.accountNumber ?? "Chưa cấu hình"}</strong>
                      </div>
                      <div>
                        <span>Chủ tài khoản</span>
                        <strong>{session.accountHolderName ?? "Chưa cấu hình"}</strong>
                      </div>
                      <div>
                        <span>Mã voucher</span>
                        <strong>{session.appliedVoucherCode ?? "Chưa áp dụng"}</strong>
                      </div>
                    </div>
                  </div>
                  {session.discountAmount > 0 || session.appliedVoucherCode ? (
                    <div className="auth-note-card">
                      <div className="auth-note-head">
                        <h3>Ưu đãi hội viên đã được áp dụng</h3>
                        <span className="pill">
                          {session.appliedVoucherCode ?? "Voucher hội viên"}
                        </span>
                      </div>
                      <p>
                        Tổng thanh toán hiện tại đã bao gồm mức giảm{" "}
                        {formatCurrency(session.discountAmount)}.
                      </p>
                    </div>
                  ) : null}
                  {holdExpiredMessage ? (
                    <div className="auth-note-card">
                      <div className="auth-note-head">
                        <h3>Đã hết thời gian giữ chỗ</h3>
                        <span className="pill">Thanh toán đã khóa</span>
                      </div>
                      <p>{holdExpiredMessage}</p>
                    </div>
                  ) : null}
                  <div className="booking-submit-row">
                    <div>
                      <span className="section-eyebrow">Phương thức</span>
                      <strong className="booking-total-amount">
                        {session.sessionMode === "live"
                          ? "SePay đối soát tự động"
                          : "SePay chuyển khoản nhanh"}
                      </strong>
                    </div>
                    <div className="auth-action-row">
                      {paymentQrCodeUrl ? (
                        <a
                          href={paymentQrCodeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="button button-primary"
                        >
                          Mở mã QR / liên kết thanh toán
                        </a>
                      ) : null}
                      {coTheXacNhanThuCong ? (
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => void handleLocalPaymentConfirmation()}
                          disabled={isPaying || isUpdatingPayment || paymentNeedsVerification || isPaymentClosed}
                        >
                          {isPaying ? "Đang xác nhận..." : "Tôi đã hoàn tất thanh toán"}
                        </button>
                      ) : null}
                      {isPaymentClosed ? (
                        <button
                          type="button"
                          className="button button-primary"
                          disabled
                        >
                          Đã hết hạn giữ chỗ
                        </button>
                      ) : null}
                      {!isPaymentClosed && !paymentQrCodeUrl && !coTheXacNhanThuCong ? (
                        <button
                          type="button"
                          className="button button-primary"
                          disabled
                        >
                          Tạm thời chưa có mã thanh toán
                        </button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </article>
          </div>

          <div className="stack-list">
            {isMemberSession ? (
              <article className="surface-card booking-payment-card">
                <div className="auth-note-head">
                  <h3>Voucher hội viên</h3>
                  <span className="pill">
                    {isLoadingVouchers ? "Đang tải" : !voucherListConfirmed || paymentNeedsVerification ? "Chưa xác minh danh sách voucher" : `${availableVouchers.length} voucher có thể chọn`}
                  </span>
                </div>
                <p>
                  Áp voucher ngay ở bước thanh toán để cập nhật tổng tiền trước khi mở mã
                  QR hoặc xác nhận chuyển khoản. Voucher chưa sử dụng chưa chắc phù hợp với booking;
                  hệ thống sẽ kiểm tra điều kiện khi bạn áp mã.
                </p>
                <label className="field">
                  <span>Mã voucher</span>
                  <input
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                    placeholder="VNA-MEMBER-01"
                    disabled={voucherActionsDisabled}
                  />
                </label>
                <div className="auth-action-row">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void handleApplyVoucher()}
                    disabled={
                      !voucherCode.trim() || voucherActionsDisabled
                    }
                  >
                    {isApplyingVoucher ? "Đang áp dụng..." : "Áp voucher"}
                  </button>
                  {session?.appliedVoucherCode ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => void handleRemoveVoucher()}
                      disabled={voucherActionsDisabled}
                    >
                      {isRemovingVoucher ? "Đang bỏ..." : "Bỏ voucher"}
                    </button>
                  ) : null}
                </div>
                {voucherErrorMessage ? (
                  <div className="auth-note-card" role="alert">
                    <div className="auth-note-head">
                      <h3>Cần kiểm tra voucher</h3>
                      <span className="pill">Cần kiểm tra lại</span>
                    </div>
                    <p>{voucherErrorMessage}</p>
                  </div>
                ) : null}
                {voucherListErrorMessage ? (
                  <div className="auth-note-card" role="alert">
                    <div className="auth-note-head">
                      <h3>Chưa cập nhật danh sách voucher</h3>
                      <span className="pill">Danh sách chưa xác minh</span>
                    </div>
                    <p>{voucherListErrorMessage}</p>
                  </div>
                ) : null}
                {voucherNotice && !paymentNeedsVerification && !isUpdatingPayment ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Đã cập nhật ưu đãi</h3>
                      <span className="pill">Sẵn sàng thanh toán</span>
                    </div>
                    <p>{voucherNotice}</p>
                  </div>
                ) : null}
                <div className="stack-list">
                  {availableVouchers.length > 0 ? (
                    availableVouchers.map((voucher) => (
                      <div key={voucher.voucherCode} className="support-compact-item">
                        <strong>{voucher.title}</strong>
                        <VoucherOriginSummary voucher={voucher} />
                        <VoucherConditionSummary voucher={voucher} />
                        <small>
                          {new Intl.NumberFormat("vi-VN").format(voucher.discountAmount)} {voucher.currency} •{" "}
                          {formatVoucherStatus(getEffectiveVoucherStatus(voucher, voucherPresentationTime))} • Hết hạn{" "}
                          {voucherExpiryMillis(voucher.expiresAt) === null ? "chưa xác minh" : formatDateTime(voucher.expiresAt)}
                        </small>
                        <div className="auth-action-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => void handleApplyVoucher(voucher.voucherCode)}
                            disabled={voucher.conditionsValid !== true || voucherActionsDisabled || !voucherListConfirmed}
                          >
                            Dùng {voucher.voucherCode}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="support-compact-item">
                      <strong>{isLoadingVouchers || isUpdatingPayment ? "Đang tải voucher..." : !voucherListConfirmed || paymentNeedsVerification ? "Chưa xác minh danh sách voucher" : "Chưa có voucher có thể chọn"}</strong>
                      <p>
                        Khi tài khoản hội viên có ưu đãi mới hoặc voucher đang được giữ cho
                        booking này, danh sách sẽ hiển thị tại đây.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ) : null}

            <SectionHeading
              eyebrow="Đi tiếp"
              title="Sau khi thanh toán thành công"
              description="Vé được phát hành cho từng hành khách và bạn sẽ được chuyển sang trang quản lý đặt chỗ ngay sau khi đối soát thành công."
            />
            <article className="surface-card booking-payment-card">
              <h3>Quản lý đặt chỗ</h3>
              <p>
                Sau khi thanh toán thành công, trang quản lý đặt chỗ sẽ hiển thị trạng thái
                vé, danh sách hành khách và thông tin làm thủ tục.
              </p>
              <Link href="/manage-booking" className="button button-secondary">
                Mở trang quản lý đặt chỗ
              </Link>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

