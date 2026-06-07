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
import { coTheXacNhanThanhToanThuCong } from "@/lib/checkout-payment";
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
    return "Sáºµn sÃ ng Ã¡p dá»¥ng";
  }

  if (status === "RESERVED") {
    return "Äang giá»¯ cho booking";
  }

  if (status === "USED") {
    return "ÄÃ£ sá»­ dá»¥ng";
  }

  if (status === "EXPIRED") {
    return "ÄÃ£ háº¿t háº¡n";
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
          resolveApiClientErrorMessage(error, "KhÃ´ng thá»ƒ chuáº©n bá»‹ thÃ´ng tin thanh toÃ¡n.")
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
    if (!bookingCode || !session || session.paymentStatus === "paid") {
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
        })
        .catch(() => {
          // Bá» qua lá»—i táº¡m thá»i khi tá»± lÃ m má»›i tráº¡ng thÃ¡i thanh toÃ¡n.
        });
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [accessToken, bookingCode, session]);

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
          resolveApiClientErrorMessage(error, "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch voucher lÃºc nÃ y.")
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
  const paymentQrCodeUrl = resolveFallbackQrCodeUrl(session);
  const coTheXacNhanThuCong = coTheXacNhanThanhToanThuCong(session);

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
        message: "Thanh toÃ¡n thÃ nh cÃ´ng.",
        title: "ÄÃ£ xuáº¥t vÃ©",
        tone: "success"
      });

      router.replace(`/manage-booking?bookingCode=${encodeURIComponent(bookingCode)}`);
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "KhÃ´ng thá»ƒ xÃ¡c nháº­n thanh toÃ¡n."));
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
        `ÄÃ£ Ã¡p voucher ${nextSession.appliedVoucherCode ?? normalizedVoucherCode} cho booking nÃ y.`
      );

      pushToast({
        message: "Æ¯u Ä‘Ã£i há»™i viÃªn Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t vÃ o tá»•ng thanh toÃ¡n.",
        title: "ÄÃ£ Ã¡p voucher",
        tone: "success"
      });
    } catch (error) {
      setVoucherErrorMessage(
        resolveApiClientErrorMessage(error, "KhÃ´ng thá»ƒ Ã¡p voucher cho booking nÃ y.")
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
            <span className="section-eyebrow">Thanh toÃ¡n</span>
            <h1 className="page-title">
              XÃ¡c nháº­n thanh toÃ¡n cho mÃ£ Ä‘áº·t chá»— {bookingCode || "..."}
            </h1>
            <p className="page-hero-copy">
              Thanh toÃ¡n Ä‘á»ƒ xuáº¥t vÃ©, gá»­i thÃ´ng tin hÃ nh trÃ¬nh qua email vÃ  má»Ÿ cÃ¡c bÆ°á»›c tá»±
              phá»¥c vá»¥ sau bÃ¡n.
            </p>
          </div>
          <div className="booking-summary-card">
            <span className="pill booking-reference-pill">BÆ°á»›c thanh toÃ¡n</span>
            <h3>{session?.paymentStatus === "paid" ? "ÄÃ£ thanh toÃ¡n" : "Chá» thanh toÃ¡n"}</h3>
            <p>
              {session
                ? `Háº¿t háº¡n lÃºc ${formatDateTime(session.expiresAt)}`
                : "Äang chuáº©n bá»‹ mÃ£ thanh toÃ¡n cho booking nÃ y."}
            </p>
            <strong>
              {session ? formatCurrency(session.amount) : "Äang chuáº©n bá»‹ thÃ´ng tin thanh toÃ¡n"}
            </strong>
            {session?.discountAmount ? (
              <small>
                ÄÃ£ giáº£m {formatCurrency(session.discountAmount)}
                {session.appliedVoucherCode ? ` báº±ng voucher ${session.appliedVoucherCode}` : ""}.
              </small>
            ) : null}
          </div>
        </div>

        <div className="section-gap" />
        <div className="section-split booking-flow-layout">
          <div className="stack-list">
            <SectionHeading
              eyebrow="Thanh toÃ¡n"
              title="Kiá»ƒm tra thÃ´ng tin thanh toÃ¡n"
              description="DÃ¹ng Ä‘Ãºng mÃ£ thanh toÃ¡n Ä‘á»ƒ SePay xÃ¡c nháº­n giao dá»‹ch vÃ  phÃ¡t hÃ nh vÃ© cho tá»«ng hÃ nh khÃ¡ch trong mÃ£ Ä‘áº·t chá»—."
            />
            <article className="surface-card booking-payment-card">
              {isLoading ? (
                <>
                  <span className="section-eyebrow">Äang táº£i</span>
                  <h3>Äang chuáº©n bá»‹ thÃ´ng tin thanh toÃ¡n...</h3>
                  <p>Vui lÃ²ng chá» trong giÃ¢y lÃ¡t Ä‘á»ƒ táº¡o mÃ£ thanh toÃ¡n cho booking nÃ y.</p>
                </>
              ) : errorMessage ? (
                <>
                  <span className="section-eyebrow">KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u</span>
                  <h3>KhÃ´ng thá»ƒ chuáº©n bá»‹ thÃ´ng tin thanh toÃ¡n</h3>
                  <p>{errorMessage}</p>
                </>
              ) : session ? (
                <>
                  <div className="booking-payment-overview">
                    {paymentQrCodeUrl ? (
                      <div className="booking-payment-qr">
                        <img
                          src={paymentQrCodeUrl}
                          alt={`MÃ£ QR thanh toÃ¡n cho ${session.referenceCode}`}
                        />
                      </div>
                    ) : null}
                    <div className="result-grid booking-payment-detail-list">
                      <div>
                        <span>MÃ£ PNR</span>
                        <strong>{session.bookingCode}</strong>
                      </div>
                      <div>
                        <span>Tráº¡ng thÃ¡i</span>
                        <strong>{session.paymentStatus}</strong>
                      </div>
                      <div>
                        <span>MÃ£ thanh toÃ¡n</span>
                        <strong>{session.referenceCode}</strong>
                      </div>
                      <div>
                        <span>Háº¿t háº¡n giá»¯ chá»—</span>
                        <strong>{formatDateTime(session.expiresAt)}</strong>
                      </div>
                      <div>
                        <span>Sá»‘ tiá»n</span>
                        <strong>{formatCurrency(session.amount)}</strong>
                      </div>
                      <div>
                        <span>Giáº£m tá»« voucher</span>
                        <strong>
                          {session.discountAmount > 0
                            ? formatCurrency(session.discountAmount)
                            : "ChÆ°a Ã¡p dá»¥ng"}
                        </strong>
                      </div>
                      <div>
                        <span>NgÃ¢n hÃ ng nháº­n</span>
                        <strong>{session.bankName ?? "ChÆ°a cáº¥u hÃ¬nh"}</strong>
                      </div>
                      <div>
                        <span>Sá»‘ tÃ i khoáº£n</span>
                        <strong>{session.accountNumber ?? "ChÆ°a cáº¥u hÃ¬nh"}</strong>
                      </div>
                      <div>
                        <span>Chá»§ tÃ i khoáº£n</span>
                        <strong>{session.accountHolderName ?? "ChÆ°a cáº¥u hÃ¬nh"}</strong>
                      </div>
                      <div>
                        <span>MÃ£ voucher</span>
                        <strong>{session.appliedVoucherCode ?? "ChÆ°a Ã¡p dá»¥ng"}</strong>
                      </div>
                    </div>
                  </div>
                  {session.discountAmount > 0 || session.appliedVoucherCode ? (
                    <div className="auth-note-card">
                      <div className="auth-note-head">
                        <h3>Æ¯u Ä‘Ã£i há»™i viÃªn Ä‘Ã£ Ä‘Æ°á»£c Ã¡p dá»¥ng</h3>
                        <span className="pill">
                          {session.appliedVoucherCode ?? "Voucher há»™i viÃªn"}
                        </span>
                      </div>
                      <p>
                        Tá»•ng thanh toÃ¡n hiá»‡n táº¡i Ä‘Ã£ bao gá»“m má»©c giáº£m{" "}
                        {formatCurrency(session.discountAmount)}.
                      </p>
                    </div>
                  ) : null}
                  <div className="booking-submit-row">
                    <div>
                      <span className="section-eyebrow">PhÆ°Æ¡ng thá»©c</span>
                      <strong className="booking-total-amount">
                        {session.sessionMode === "live"
                          ? "SePay Ä‘á»‘i soÃ¡t tá»± Ä‘á»™ng"
                          : "SePay chuyá»ƒn khoáº£n nhanh"}
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
                          Má»Ÿ mÃ£ QR / liÃªn káº¿t thanh toÃ¡n
                        </a>
                      ) : null}
                      {coTheXacNhanThuCong ? (
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => void handleLocalPaymentConfirmation()}
                          disabled={isPaying}
                        >
                          {isPaying ? "Äang xÃ¡c nháº­n..." : "TÃ´i Ä‘Ã£ hoÃ n táº¥t thanh toÃ¡n"}
                        </button>
                      ) : null}
                      {!paymentQrCodeUrl && !coTheXacNhanThuCong ? (
                        <button
                          type="button"
                          className="button button-primary"
                          disabled
                        >
                          Táº¡m thá»i chÆ°a cÃ³ mÃ£ thanh toÃ¡n
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
                  <h3>Voucher há»™i viÃªn</h3>
                  <span className="pill">
                    {isLoadingVouchers ? "Äang táº£i" : `${availableVouchers.length} voucher kháº£ dá»¥ng`}
                  </span>
                </div>
                <p>
                  Ãp voucher ngay á»Ÿ bÆ°á»›c thanh toÃ¡n Ä‘á»ƒ cáº­p nháº­t tá»•ng tiá»n trÆ°á»›c khi má»Ÿ mÃ£
                  QR hoáº·c xÃ¡c nháº­n chuyá»ƒn khoáº£n.
                </p>
                <label className="field">
                  <span>MÃ£ voucher</span>
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
                    {isApplyingVoucher ? "Äang Ã¡p dá»¥ng..." : "Ãp voucher"}
                  </button>
                </div>
                {voucherErrorMessage ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>KhÃ´ng thá»ƒ Ã¡p voucher</h3>
                      <span className="pill">Cáº§n kiá»ƒm tra láº¡i</span>
                    </div>
                    <p>{voucherErrorMessage}</p>
                  </div>
                ) : null}
                {voucherNotice ? (
                  <div className="auth-note-card">
                    <div className="auth-note-head">
                      <h3>ÄÃ£ cáº­p nháº­t Æ°u Ä‘Ã£i</h3>
                      <span className="pill">Sáºµn sÃ ng thanh toÃ¡n</span>
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
                          {formatCurrency(voucher.discountAmount)} â€¢{" "}
                          {formatVoucherStatus(voucher.status)} â€¢ Háº¿t háº¡n{" "}
                          {formatDateTime(voucher.expiresAt)}
                        </small>
                        <div className="auth-action-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => void handleApplyVoucher(voucher.voucherCode)}
                            disabled={isApplyingVoucher || isLoading}
                          >
                            DÃ¹ng {voucher.voucherCode}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="support-compact-item">
                      <strong>ChÆ°a cÃ³ voucher kháº£ dá»¥ng</strong>
                      <p>
                        Khi tÃ i khoáº£n há»™i viÃªn cÃ³ Æ°u Ä‘Ã£i má»›i hoáº·c voucher Ä‘ang Ä‘Æ°á»£c giá»¯ cho
                        booking nÃ y, danh sÃ¡ch sáº½ hiá»ƒn thá»‹ táº¡i Ä‘Ã¢y.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ) : null}

            <SectionHeading
              eyebrow="Äi tiáº¿p"
              title="Sau khi thanh toÃ¡n thÃ nh cÃ´ng"
              description="VÃ© Ä‘Æ°á»£c phÃ¡t hÃ nh cho tá»«ng hÃ nh khÃ¡ch vÃ  báº¡n sáº½ Ä‘Æ°á»£c chuyá»ƒn sang trang quáº£n lÃ½ Ä‘áº·t chá»— ngay sau khi Ä‘á»‘i soÃ¡t thÃ nh cÃ´ng."
            />
            <article className="surface-card booking-payment-card">
              <h3>Quáº£n lÃ½ Ä‘áº·t chá»—</h3>
              <p>
                Sau khi thanh toÃ¡n thÃ nh cÃ´ng, trang quáº£n lÃ½ Ä‘áº·t chá»— sáº½ hiá»ƒn thá»‹ tráº¡ng thÃ¡i
                vÃ©, danh sÃ¡ch hÃ nh khÃ¡ch vÃ  thÃ´ng tin lÃ m thá»§ tá»¥c.
              </p>
              <Link href="/manage-booking" className="button button-secondary">
                Má»Ÿ trang quáº£n lÃ½ Ä‘áº·t chá»—
              </Link>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

