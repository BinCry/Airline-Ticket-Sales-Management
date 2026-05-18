"use client";

import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  deleteBackofficeAuditLog,
  fetchBackofficeDashboard,
  fetchBackofficeUsers,
  updateBackofficeUserRoles,
  updateBackofficeUserStatus,
  type BackofficeAdminDashboard,
  type BackofficeAdminUser
} from "@/lib/backoffice-admin-api";
import { pushToast } from "@/lib/toast";

type AdminState = "idle" | "loading" | "success" | "error";

const ROLE_OPTIONS = [
  "customer",
  "member",
  "customer_support",
  "operations_staff"
] as const;

const STATUS_OPTIONS = ["active", "locked", "suspended"] as const;

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

function formatRoleLabel(role: string) {
  switch (role) {
    case "guest":
      return "Khách vãng lai";
    case "customer":
      return "Khách hàng";
    case "member":
      return "Hội viên";
    case "customer_support":
      return "Chăm sóc khách hàng";
    case "operations_staff":
      return "Vận hành";
    default:
      return role;
  }
}

function formatStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "locked":
      return "Đã khóa";
    case "suspended":
      return "Tạm dừng";
    default:
      return status;
  }
}

export function BackofficeAdminPageClient() {
  const [state, setState] = useState<AdminState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<BackofficeAdminDashboard | null>(null);
  const [users, setUsers] = useState<BackofficeAdminUser[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingAuditLogId, setPendingAuditLogId] = useState<number | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<number, string>>({});
  const [draftStatuses, setDraftStatuses] = useState<Record<number, string>>({});

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadAdminData(accessToken);
  }, [accessToken]);

  async function loadAdminData(nextAccessToken: string) {
    setState("loading");
    setErrorMessage(null);

    try {
      const [nextDashboard, nextUsers] = await Promise.all([
        fetchBackofficeDashboard(nextAccessToken),
        fetchBackofficeUsers(nextAccessToken)
      ]);

      setDashboard(nextDashboard);
      setUsers(nextUsers);
      setDraftRoles(
        Object.fromEntries(nextUsers.map((user) => [user.id, user.roles[0] ?? "customer"]))
      );
      setDraftStatuses(Object.fromEntries(nextUsers.map((user) => [user.id, user.status])));
      setState("success");
    } catch (error) {
      setDashboard(null);
      setUsers([]);
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể tải dữ liệu quản trị lúc này."));
      setState("error");
    }
  }

  async function handleRoleSave(userId: number) {
    if (!accessToken || pendingUserId !== null) {
      return;
    }

    const nextRole = draftRoles[userId];
    if (!nextRole) {
      return;
    }

    setPendingUserId(userId);
    setErrorMessage(null);

    try {
      await updateBackofficeUserRoles(userId, [nextRole], accessToken);
      await loadAdminData(accessToken);
      pushToast({
        title: "Đã cập nhật vai trò",
        message: "Vai trò tài khoản nội bộ đã được lưu.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể cập nhật vai trò."));
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleStatusSave(userId: number) {
    if (!accessToken || pendingUserId !== null) {
      return;
    }

    const nextStatus = draftStatuses[userId];
    if (!nextStatus) {
      return;
    }

    setPendingUserId(userId);
    setErrorMessage(null);

    try {
      await updateBackofficeUserStatus(userId, nextStatus, accessToken);
      await loadAdminData(accessToken);
      pushToast({
        title: "Đã cập nhật trạng thái",
        message: "Trạng thái tài khoản nội bộ đã được lưu.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể cập nhật trạng thái."));
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleDeleteAuditLog(auditLogId: number) {
    if (!accessToken || pendingAuditLogId !== null) {
      return;
    }

    const shouldDelete = window.confirm("Xóa nhật ký thao tác này khỏi danh sách quản trị?");
    if (!shouldDelete) {
      return;
    }

    setPendingAuditLogId(auditLogId);
    setErrorMessage(null);

    try {
      await deleteBackofficeAuditLog(auditLogId, accessToken);
      await loadAdminData(accessToken);
      pushToast({
        title: "Đã xóa nhật ký thao tác",
        message: "Bản ghi đã được gỡ khỏi danh sách quản trị.",
        tone: "success"
      });
    } catch (error) {
      setErrorMessage(resolveApiClientErrorMessage(error, "Không thể xóa nhật ký thao tác."));
    } finally {
      setPendingAuditLogId(null);
    }
  }

  const metrics = useMemo(() => dashboard?.metrics ?? [], [dashboard]);
  const modules = useMemo(() => dashboard?.modules ?? [], [dashboard]);
  const auditTrail = useMemo(() => dashboard?.auditTrail ?? [], [dashboard]);

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice quản trị"
          title="Theo dõi chỉ số vận hành và quản lý tài khoản nội bộ"
          description="Dữ liệu dưới đây lấy trực tiếp từ booking, refund, notification outbox và nhật ký thao tác."
        />

        {errorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể tải dữ liệu</strong>
            <p>{errorMessage}</p>
          </article>
        ) : null}

        <div className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.trend}</p>
            </article>
          ))}
        </div>

        <div className="section-gap" />
        <div className="section-split">
          <article className="surface-card">
            <SectionHeading
              eyebrow="Phân hệ đang vận hành"
              title="Danh mục công cụ nội bộ"
              description="Các phân hệ được mô tả đúng theo quyền và công việc hiện tại."
            />
            <div className="stack-list">
              {modules.map((module) => (
                <article key={module.key} className="surface-card admin-nested-card">
                  <h3>{module.title}</h3>
                  <p>{module.summary}</p>
                  <small>Vai trò sử dụng: {module.roles.map(formatRoleLabel).join(", ")}</small>
                </article>
              ))}
            </div>
          </article>

          <article className="surface-card">
            <SectionHeading
              eyebrow="Nhật ký thao tác"
              title="Các thay đổi nhạy cảm gần nhất"
              description="Giúp kiểm tra nhanh các thao tác đổi role, khóa tài khoản hoặc xử lý vận hành."
            />
            <div className="stack-list">
              {auditTrail.length > 0 ? (
                auditTrail.map((item) => (
                  <article key={item.id} className="surface-card admin-nested-card">
                    <div className="result-top">
                      <div>
                        <h3>{item.actor}</h3>
                        <p>{item.action}</p>
                      </div>
                      <span className="pill">{item.time}</span>
                    </div>
                    <p>{item.target}</p>
                    <div className="finance-action-row">
                      <button
                        type="button"
                        className="button button-secondary admin-audit-delete-button"
                        onClick={() => void handleDeleteAuditLog(item.id)}
                        disabled={pendingAuditLogId === item.id || pendingUserId !== null}
                      >
                        {pendingAuditLogId === item.id ? "Đang xóa..." : "Xóa nhật ký"}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <article className="booking-inline-info">
                  <strong>Chưa có nhật ký</strong>
                  <p>Hiện chưa ghi nhận thao tác nhạy cảm nào.</p>
                </article>
              )}
            </div>
          </article>
        </div>

        <div className="section-gap" />
        <article className="table-card admin-user-table-card">
          <div className="finance-table-head">
            <div>
              <span className="section-eyebrow">Tài khoản nội bộ</span>
              <h3>Quản lý vai trò và trạng thái tài khoản</h3>
              <p>Chọn vai trò hoặc trạng thái mới rồi lưu ngay trên từng dòng người dùng.</p>
            </div>
            <button
              type="button"
              className="button button-secondary admin-refresh-button"
              onClick={() => accessToken ? void loadAdminData(accessToken) : undefined}
              disabled={
                !accessToken
                || state === "loading"
                || pendingUserId !== null
                || pendingAuditLogId !== null
              }
            >
              {state === "loading" ? "Đang tải..." : "Tải lại dữ liệu"}
            </button>
          </div>

          <div className="table-wrap admin-user-table-wrap">
            <table data-mobile-stack="true">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Phiên gần nhất</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => {
                    const isWorking = pendingUserId === user.id;

                    return (
                      <tr key={user.id}>
                        <td data-label="Tài khoản">
                          <div className="finance-cell-stack">
                            <strong>{user.displayName}</strong>
                            <span>{user.email}</span>
                            <small>
                              {user.emailVerified ? "Đã xác minh email" : "Chưa xác minh email"}
                            </small>
                          </div>
                        </td>
                        <td data-label="Vai trò">
                          <div className="admin-inline-form">
                            <select
                              value={draftRoles[user.id] ?? user.roles[0] ?? "customer"}
                              onChange={(event) =>
                                setDraftRoles((current) => ({
                                  ...current,
                                  [user.id]: event.target.value
                                }))
                              }
                              disabled={isWorking}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {formatRoleLabel(role)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => void handleRoleSave(user.id)}
                              disabled={isWorking}
                            >
                              Lưu role
                            </button>
                          </div>
                        </td>
                        <td data-label="Trạng thái">
                          <div className="admin-inline-form">
                            <select
                              value={draftStatuses[user.id] ?? user.status}
                              onChange={(event) =>
                                setDraftStatuses((current) => ({
                                  ...current,
                                  [user.id]: event.target.value
                                }))
                              }
                              disabled={isWorking}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {formatStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => void handleStatusSave(user.id)}
                              disabled={isWorking}
                            >
                              Lưu trạng thái
                            </button>
                          </div>
                        </td>
                        <td data-label="Phiên gần nhất">
                          <div className="finance-cell-stack">
                            <strong>{formatDateTime(user.lastLoginAt)}</strong>
                            <small>
                              {user.lockedAt ? `Khóa lúc ${formatDateTime(user.lockedAt)}` : "Chưa bị khóa"}
                            </small>
                          </div>
                        </td>
                        <td data-label="Hành động">
                          <div className="finance-cell-stack">
                            <strong>{formatStatusLabel(user.status)}</strong>
                            <small>{user.roles.map(formatRoleLabel).join(", ")}</small>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <article className="booking-inline-info admin-empty-state-card">
                        <strong>{state === "loading" ? "Đang tải..." : "Không có tài khoản"}</strong>
                        <p>
                          {state === "loading"
                            ? "Đang tải danh sách tài khoản nội bộ."
                            : "Chưa có tài khoản nội bộ nào để hiển thị."}
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
