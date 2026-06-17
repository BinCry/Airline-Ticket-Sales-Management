"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

import { HoldCountdown } from "@/components/hold-countdown";
import { SectionHeading } from "@/components/section-heading";
import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  applyVoucherToBooking,
  confirmLocalPayment,
  createPaymentSession,
  removeVoucherFromBooking
} from "@/lib/booking-api";
import { coTheXacNhanThanhToanThuCong } from "@/lib/checkout-payment";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { fetchMyVouchers, type MyVoucher } from "@/lib/my-account-api";
import { pushToast } from "@/lib/toast";

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
  if (status === "AVAILABLE") {
    return "Sẵn sàng áp dụng";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [isMemberSession, setIsMemberSession] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voucherErrorMessage, setVoucherErrorMessage] = useState<string | null>(null);
  const [voucherNotice, setVoucherNotice] = useState<string | null>(null);
  const [holdExpiredMessage, setHoldExpiredMessage] = useState<string | null>(null);
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

    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      setErrorMessage(null);
      setHoldExpiredMessage(null);

      try {
        const nextSession = await createPaymentSession(bookingCode, accessToken);
        if (!isMounted) {
          return;
        }
        setSession(nextSession);
        setHoldExpiredMessage(
          isClosedPaymentStatus(nextSession.paymentStatus) ? HOLD_EXPIRED_NOTICE : null
        );
      } catch (error) {
        if (!isMounted) {
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initSession();

    return () => {
      isMounted = false;
    };
  }, [accessToken, bookingCode]);

  useEffect(() => {
    if (!bookingCode || !session || session.paymentStatus === "paid" || holdExpiredMessage) {
      return;
    }

    let isMounted = true;
    const intervalId = window.setInterval(() => {
      void createPaymentSession(bookingCode, accessToken)
        .then((nextSession) => {
          if (!isMounted) {
            return;
          }
          setSession(nextSession);
          if (isClosedPaymentStatus(nextSession.paymentStatus)) {
            setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
          }
        })
        .catch((error) => {
          if (isMounted && isHoldExpiredError(error)) {
            setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
          }
        });
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [accessToken, bookingCode, holdExpiredMessage, session]);

  useEffect(() => {
    if (!accessToken || !isMemberSession) {
      setMemberVouchers([]);
      setVoucherErrorMessage(null);
      return;
    }

    const memberAccessToken = accessToken;
    let isMounted = true;

    async function loadMemberVouchers() {
      setIsLoadingVouchers(true);
      setVoucherErrorMessage(null);

      try {
        const nextVouchers = await fetchMyVouchers(memberAccessToken);
        if (!isMounted) {
          return;
        }
        setMemberVouchers(nextVouchers);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setMemberVouchers([]);
        setVoucherErrorMessage(
          resolveApiClientErrorMessage(error, "Không thể tải danh sách voucher lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsLoadingVouchers(false);
        }
      }
    }

    void loadMemberVouchers();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isMemberSession]);

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
    if (!bookingCode || isRefreshingExpiredHoldRef.current) {
      return;
    }

    isRefreshingExpiredHoldRef.current = true;
    try {
      const nextSession = await createPaymentSession(bookingCode, accessToken);
      setSession(nextSession);
      if (isClosedPaymentStatus(nextSession.paymentStatus)) {
        setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
      }
    } catch (error) {
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
  }, [accessToken, bookingCode]);

  const availableVouchers = memberVouchers.filter(
    (voucher) =>
      voucher.status === "AVAILABLE" ||
      (voucher.status === "RESERVED" && voucher.bookingCode === bookingCode)
  );
  const isPaymentClosed = Boolean(holdExpiredMessage) || isClosedPaymentStatus(session?.paymentStatus);
  const paymentQrCodeUrl = isPaymentClosed ? null : resolveFallbackQrCodeUrl(session);
  const coTheXacNhanThuCong = !isPaymentClosed && coTheXacNhanThanhToanThuCong(session);
  const isHoldingSession = session?.paymentStatus === "pending" && !isPaymentClosed;
  const hasAppliedVoucher = Boolean(session?.appliedVoucherCode || (session?.discountAmount ?? 0) > 0);

  async function handleLocalPaymentConfirmation() {
    if (!bookingCode || isPaying || isPaymentClosed || session?.sessionMode !== "local") {
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    try {
      await confirmLocalPayment(
        {
          bookingCode,
          result: "success"
        },
        accessToken
      );

      pushToast({
        message: "Thanh toán thành công.",
        title: "Đã xuất vé",
        tone: "success"
      });

      router.replace(`/manage-booking?bookingCode=${encodeURIComponent(bookingCode)}`);
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể xác nhận thanh toán."));
    } finally {
      setIsPaying(false);
    }
  }

  async function handleApplyVoucher(nextVoucherCode?: string) {
    const normalizedVoucherCode = (nextVoucherCode ?? voucherCode).trim().toUpperCase();

    if (
      !bookingCode ||
      !accessToken ||
      !isMemberSession ||
      !normalizedVoucherCode ||
      isApplyingVoucher ||
      isPaymentClosed
    ) {
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherErrorMessage(null);
    setVoucherNotice(null);

    try {
      await applyVoucherToBooking(
        bookingCode,
        {
          voucherCode: normalizedVoucherCode
        },
        accessToken
      );

      const [nextSession, nextVouchers] = await Promise.all([
        createPaymentSession(bookingCode, accessToken),
        fetchMyVouchers(accessToken)
      ]);

      setSession(nextSession);
      setMemberVouchers(nextVouchers);
      if (isClosedPaymentStatus(nextSession.paymentStatus)) {
        setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
        return;
      }
      setVoucherCode(nextSession.appliedVoucherCode ?? normalizedVoucherCode);
      setVoucherNotice(
        `Đã áp voucher ${nextSession.appliedVoucherCode ?? normalizedVoucherCode} cho booking này.`
      );

      pushToast({
        message: "Ưu đãi hội viên đã được cập nhật vào tổng thanh toán.",
        title: "Đã áp voucher",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(
        resolveApiClientErrorMessage(error, "Không thể áp voucher cho booking này.")
      );
    } finally {
      setIsApplyingVoucher(false);
    }
  }

  async function handleRemoveVoucher() {
    if (!bookingCode || !accessToken || !isMemberSession || isApplyingVoucher || isPaymentClosed) {
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherErrorMessage(null);
    setVoucherNotice(null);

    try {
      await removeVoucherFromBooking(bookingCode, accessToken);

      const [nextSession, nextVouchers] = await Promise.all([
        createPaymentSession(bookingCode, accessToken),
        fetchMyVouchers(accessToken)
      ]);

      setSession(nextSession);
      setMemberVouchers(nextVouchers);
      setVoucherCode("");
      setVoucherNotice(null);
      setVoucherErrorMessage(null);

      if (isClosedPaymentStatus(nextSession.paymentStatus)) {
        setHoldExpiredMessage(HOLD_EXPIRED_NOTICE);
        return;
      }

      pushToast({
        message: "Tổng tiền đã quay về mức trước khi áp ưu đãi hội viên.",
        title: "Đã bỏ voucher",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(
        resolveApiClientErrorMessage(error, "Không thể bỏ voucher khỏi booking này.")
      );
    } finally {
      setIsApplyingVoucher(false);
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
            <h1 className="page-title">
              Xác nhận thanh toán cho mã đặt chỗ {bookingCode || "..."}
            </h1>
            <p className="page-hero-copy">
              Thanh toán để xuất vé, gửi thông tin hành trình qua email và mở các bước tự
              phục vụ sau bán.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">Bước thanh toán</span>
            <h3>{session?.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}</h3>
            <p>
              {session
                ? `Hết hạn lúc ${formatDateTime(session.expiresAt)}`
                : "Đang chuẩn bị mã thanh toán cho booking này."}
            </p>
            <strong>
              {session ? formatCurrency(session.amount) : "Đang chuẩn bị thông tin thanh toán"}
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
              {isLoading ? (
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
                          disabled={isPaying || isPaymentClosed}
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
                    {isLoadingVouchers ? "Đang tải" : `${availableVouchers.length} voucher khả dụng`}
                  </span>
                </div>
                <p>
                  Áp voucher ngay ở bước thanh toán để cập nhật tổng tiền trước khi mở mã
                  QR hoặc xác nhận chuyển khoản.
                </p>
                <label className="field">
                  <span>Mã voucher</span>
                  <input
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                    placeholder="VNA-MEMBER-01"
                  />
                </label>
                <div className="auth-action-row">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void handleApplyVoucher()}
                    disabled={!voucherCode.trim() || isApplyingVoucher || isLoading || isPaymentClosed}
                  >
                    {isApplyingVoucher ? "Đang áp dụng..." : "Áp voucher"}
                  </button>
                  {hasAppliedVoucher ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => void handleRemoveVoucher()}
                      disabled={isApplyingVoucher || isLoading || isPaymentClosed}
                    >
                      Bỏ voucher
                    </button>
                  ) : null}
                </div>
                {voucherErrorMessage ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>Không thể áp voucher</h3>
                      <span className="pill">Cần kiểm tra lại</span>
                    </div>
                    <p>{voucherErrorMessage}</p>
                  </div>
                ) : null}
                {voucherNotice ? (
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
                        <p>{voucher.description}</p>
                        <small>
                          {formatCurrency(voucher.discountAmount)} •{" "}
                          {formatVoucherStatus(voucher.status)} • Hết hạn{" "}
                          {formatDateTime(voucher.expiresAt)}
                        </small>
                        <div className="auth-action-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => void handleApplyVoucher(voucher.voucherCode)}
                            disabled={isApplyingVoucher || isLoading || isPaymentClosed}
                          >
                            Dùng {voucher.voucherCode}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="support-compact-item">
                      <strong>Chưa có voucher khả dụng</strong>
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

