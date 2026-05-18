"use client";

import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  approveBackofficeRefund,
  fetchBackofficeRefunds,
  hideBackofficeRefund,
  rejectBackofficeRefund,
  type BackofficeRefundItem
} from "@/lib/backoffice-finance-api";
import { formatCurrency } from "@/lib/format";
import { pushToast } from "@/lib/toast";

type FinanceState = "idle" | "loading" | "success" | "error";

function formatRefundStatus(status: BackofficeRefundItem["status"]) {
  switch (status) {
    case "pending":
      return "Đang chờ duyệt";
    case "approved":
      return "Đã duyệt";
    case "rejected":
      return "Đã từ chối";
    default:
      return status;
  }
}

function formatBookingStatus(status: BackofficeRefundItem["bookingStatus"]) {
  switch (status) {
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

export function BackofficeFinancePageClient() {
  const [state, setState] = useState<FinanceState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<BackofficeRefundItem[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadRefunds(accessToken);
  }, [accessToken]);

  async function loadRefunds(nextAccessToken: string) {
    setState("loading");
    setErrorMessage(null);

    try {
      const nextRefunds = await fetchBackofficeRefunds(nextAccessToken);
      setRefunds(nextRefunds);
      setState("success");
    } catch (error) {
      setRefunds([]);
      setErrorMessage(
        resolveApiClientErrorMessage(error, "Không thể tải danh sách yêu cầu hoàn vé lúc này.")
      );
      setState("error");
    }
  }

  async function handleAction(refundRequestId: number, action: "approve" | "reject") {
    if (!accessToken || pendingActionId !== null) {
      return;
    }

    setPendingActionId(refundRequestId);

    try {
      if (action === "approve") {
        await approveBackofficeRefund(refundRequestId, accessToken);
        pushToast({
          title: "Đã cập nhật yêu cầu",
          message: "Đã duyệt hoàn tiền thành công.",
          tone: "success"
        });
      } else {
        await rejectBackofficeRefund(refundRequestId, accessToken);
        pushToast({
          title: "Đã cập nhật yêu cầu",
          message: "Đã từ chối yêu cầu hoàn vé.",
          tone: "success"
        });
      }

      await loadRefunds(accessToken);
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể cập nhật yêu cầu hoàn vé lúc này."));
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleHideRefund(refundRequestId: number) {
    if (!accessToken || pendingActionId !== null) {
      return;
    }

    const shouldHide = window.confirm("Xóa yêu cầu hoàn vé đã xử lý khỏi danh sách hiển thị?");
    if (!shouldHide) {
      return;
    }

    setPendingActionId(refundRequestId);

    try {
      await hideBackofficeRefund(refundRequestId, accessToken);
      await loadRefunds(accessToken);
      pushToast({
        title: "Đã xóa khỏi danh sách",
        message: "Yêu cầu hoàn vé đã xử lý đã được ẩn khỏi giao diện vận hành.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể xóa yêu cầu hoàn vé khỏi danh sách."));
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice tài chính"
          title="Quản lý yêu cầu hoàn vé"
          description="Nhân viên chăm sóc khách hàng có thể rà soát, duyệt hoặc từ chối yêu cầu hoàn tiền ngay trên một bảng dữ liệu duy nhất."
        />

        <article className="table-card finance-table-card">
          <div className="finance-table-head">
            <div>
              <span className="section-eyebrow">Danh sách hoàn vé</span>
              <h3>Tất cả yêu cầu đang chờ xử lý</h3>
              <p>Danh sách hiển thị các yêu cầu hoàn vé cần kiểm tra và phê duyệt.</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => accessToken ? void loadRefunds(accessToken) : undefined}
              disabled={!accessToken || state === "loading" || pendingActionId !== null}
            >
              {state === "loading" ? "Đang tải..." : "Tải lại danh sách"}
            </button>
          </div>

          {errorMessage ? (
            <article className="booking-inline-error">
              <strong>Không thể tải dữ liệu</strong>
              <p>{errorMessage}</p>
            </article>
          ) : null}

          <div className="table-wrap finance-table-wrap">
            <table data-mobile-stack="true">
              <thead>
                <tr>
                  <th>Mã PNR</th>
                  <th>Ngày yêu cầu</th>
                  <th>Lý do</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {refunds.length > 0 ? (
                  refunds.map((refund) => {
                    const isPending = refund.status === "pending";
                    const isWorking = pendingActionId === refund.id;

                    return (
                      <tr key={refund.id}>
                        <td data-label="Mã PNR">
                          <div className="finance-cell-stack">
                            <strong>{refund.bookingCode}</strong>
                            <span>{formatBookingStatus(refund.bookingStatus)}</span>
                            <small>{refund.contactName}</small>
                          </div>
                        </td>
                        <td data-label="Ngày yêu cầu">{formatDateTime(refund.createdAt)}</td>
                        <td data-label="Lý do">{refund.reason}</td>
                        <td data-label="Số tiền">{formatCurrency(refund.refundAmount)}</td>
                        <td data-label="Trạng thái">
                          <span className={`pill finance-status-pill finance-status-${refund.status}`}>
                            {formatRefundStatus(refund.status)}
                          </span>
                        </td>
                        <td data-label="Hành động">
                          {isPending ? (
                            <div className="finance-action-row">
                              <button
                                type="button"
                                className="button button-primary finance-approve-button"
                                disabled={isWorking || pendingActionId !== null}
                                onClick={() => void handleAction(refund.id, "approve")}
                              >
                                {isWorking ? "Đang xử lý..." : "Duyệt hoàn tiền"}
                              </button>
                              <button
                                type="button"
                                className="button button-secondary finance-reject-button"
                                disabled={isWorking || pendingActionId !== null}
                                onClick={() => void handleAction(refund.id, "reject")}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <div className="finance-action-row">
                              <button
                                type="button"
                                className="button button-secondary"
                                disabled={isWorking || pendingActionId !== null}
                                onClick={() => void handleHideRefund(refund.id)}
                              >
                                {isWorking ? "Đang xóa..." : "Xóa sau xử lý"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <article className="booking-inline-info">
                        <strong>{state === "loading" ? "Đang tải..." : "Không tìm thấy dữ liệu"}</strong>
                        <p>
                          {state === "loading"
                            ? "Đang tải danh sách yêu cầu hoàn vé."
                            : "Hiện chưa có yêu cầu hoàn vé nào cần xử lý."}
                        </p>
                      </article>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pendingActionId !== null ? (
            <div className="finance-processing-overlay" aria-hidden="true">
              <div className="surface-card finance-processing-card">
                <span className="section-eyebrow">Đang xử lý</span>
                <h3>Vui lòng chờ trong giây lát</h3>
                <p>Đang cập nhật trạng thái yêu cầu hoàn vé và làm mới bảng dữ liệu.</p>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
