"use client";

import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  fetchBackofficeNotifications,
  retryBackofficeNotification,
  type BackofficeNotificationItem
} from "@/lib/backoffice-support-api";
import { formatDateTime as formatDateTimeText } from "@/lib/format";
import { pushToast } from "@/lib/toast";

type SupportState = "idle" | "loading" | "success" | "error";

function formatNotificationStatus(status: string) {
  switch (status) {
    case "FAILED":
      return "Gửi lỗi";
    case "PENDING":
      return "Đang chờ gửi";
    case "SENT":
      return "Đã gửi";
    default:
      return status;
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  return formatDateTimeText(value);
}

export function BackofficeSupportPageClient() {
  const [state, setState] = useState<SupportState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<BackofficeNotificationItem[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<number | null>(null);

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadNotifications(accessToken);
  }, [accessToken]);

  async function loadNotifications(nextAccessToken: string) {
    setState("loading");
    setErrorMessage(null);

    try {
      const nextNotifications = await fetchBackofficeNotifications(nextAccessToken);
      setNotifications(nextNotifications);
      setState("success");
    } catch (error) {
      setNotifications([]);
      setErrorMessage(
        resolveApiClientErrorMessage(error, "Không thể tải danh sách email vé lúc này.")
      );
      setState("error");
    }
  }

  async function handleRetry(notificationId: number) {
    if (!accessToken || pendingNotificationId !== null) {
      return;
    }

    setPendingNotificationId(notificationId);
    setErrorMessage(null);

    try {
      await retryBackofficeNotification(notificationId, accessToken);
      await loadNotifications(accessToken);
      pushToast({
        title: "Đã xử lý email vé",
        message: "Yêu cầu gửi lại email đã được tiếp nhận.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể gửi lại email vé."));
    } finally {
      setPendingNotificationId(null);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice hỗ trợ"
          title="Theo dõi và gửi lại email vé"
          description="Nhân viên chăm sóc khách hàng có thể rà soát toàn bộ email vé đã gửi, đang chờ gửi hoặc bị lỗi."
        />

        <article className="table-card support-table-card">
          <div className="finance-table-head">
            <div>
              <span className="section-eyebrow">Notification outbox</span>
              <h3>Danh sách email vé và trạng thái gửi</h3>
              <p>Ưu tiên xử lý các email lỗi để hành khách nhận lại thông tin vé kịp thời.</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => accessToken ? void loadNotifications(accessToken) : undefined}
              disabled={!accessToken || state === "loading" || pendingNotificationId !== null}
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

          <div className="table-wrap">
            <table data-mobile-stack="true">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Người nhận</th>
                  <th>Tiêu đề</th>
                  <th>Trạng thái</th>
                  <th>Lần thử</th>
                  <th>Thời điểm cập nhật</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const isSent = notification.status === "SENT";
                    const isWorking = pendingNotificationId === notification.id;

                    return (
                      <tr key={notification.id}>
                        <td data-label="Booking">
                          <div className="finance-cell-stack">
                            <strong>{notification.bookingCode ?? "Không gắn booking"}</strong>
                            <span className="support-notification-type">{notification.type}</span>
                          </div>
                        </td>
                        <td data-label="Người nhận">
                          <span className="support-recipient-email">{notification.recipientEmail}</span>
                        </td>
                        <td data-label="Tiêu đề">
                          <div className="finance-cell-stack">
                            <strong>{notification.subject}</strong>
                            <small>{notification.lastError ?? "Không có lỗi gần nhất."}</small>
                          </div>
                        </td>
                        <td data-label="Trạng thái">
                          <span className={`pill finance-status-pill finance-status-${notification.status.toLowerCase()}`}>
                            {formatNotificationStatus(notification.status)}
                          </span>
                        </td>
                        <td data-label="Lần thử">{notification.retryCount}</td>
                        <td data-label="Thời điểm cập nhật">
                          {formatDateTime(notification.sentAt ?? notification.updatedAt)}
                        </td>
                        <td data-label="Hành động">
                          {isSent ? (
                            <span className="finance-muted-action">Không cần thao tác thêm</span>
                          ) : (
                            <button
                              type="button"
                              className="button button-primary finance-approve-button"
                              disabled={pendingNotificationId !== null}
                              onClick={() => void handleRetry(notification.id)}
                            >
                              {isWorking ? "Đang gửi..." : "Gửi lại email"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <article className="booking-inline-info">
                        <strong>
                          {state === "loading" ? "Đang tải..." : "Không có email cần theo dõi"}
                        </strong>
                        <p>
                          {state === "loading"
                            ? "Đang tải danh sách email vé."
                            : "Chưa có bản ghi notification nào trong outbox."}
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
