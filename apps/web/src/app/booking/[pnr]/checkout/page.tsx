"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  applyVoucherToBooking,
  confirmLocalPayment,
  createPaymentSession
} from "@/lib/booking-api";
import { formatCurrency } from "@/lib/format";
import { fetchMyVouchers, type MyVoucher } from "@/lib/my-account-api";
import { pushToast } from "@/lib/toast";

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

      try {
        const nextSession = await createPaymentSession(bookingCode, accessToken);
        if (!isMounted) {
          return;
        }
        setSession(nextSession);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSession(null);
        setErrorMessage(
          resolveApiClientErrorMessage(error, "Không thể chuẩn bị thông tin thanh toán.")
        );
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

  const availableVouchers = memberVouchers.filter(
    (voucher) =>
      voucher.status === "AVAILABLE" ||
      (voucher.status === "RESERVED" && voucher.bookingCode === bookingCode)
  );

  async function handleLocalPaymentConfirmation() {
    if (!bookingCode || isPaying || session?.sessionMode !== "local") {
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
      isApplyingVoucher
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

  return (
    <section className="section">
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
                  <div className="result-grid result-grid-rich">
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
                  {session.qrCodeUrl ? (
                    <div className="booking-payment-qr">
                      <img
                        src={session.qrCodeUrl}
                        alt={`Mã QR thanh toán cho ${session.referenceCode}`}
                      />
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
                    {session.sessionMode === "live" && session.paymentUrl ? (
                      <a
                        href={session.paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="button button-primary"
                      >
                        Mở mã QR / liên kết thanh toán
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleLocalPaymentConfirmation}
                        disabled={isPaying}
                      >
                        {isPaying ? "Đang xác nhận..." : "Tôi đã hoàn tất thanh toán"}
                      </button>
                    )}
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
                    disabled={!voucherCode.trim() || isApplyingVoucher || isLoading}
                  >
                    {isApplyingVoucher ? "Đang áp dụng..." : "Áp voucher"}
                  </button>
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
                            disabled={isApplyingVoucher || isLoading}
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
