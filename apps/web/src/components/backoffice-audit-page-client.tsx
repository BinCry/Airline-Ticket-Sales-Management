"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { DateField } from "@/components/date-field";
import { SectionHeading } from "@/components/section-heading";
import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";
import {
  downloadAuditLogCsv, fetchAuditLogActions, fetchAuditLogs, startAuditCsvDownload,
  type AuditLogItem, type AuditLogPage
} from "@/lib/audit-log-api";
import {
  createDefaultAuditLogFilters, getAuditActionGroups, getAuditActionsInGroup,
  normalizeAuditLogFilters, validateAuditLogFilters, type AuditLogFilters
} from "@/lib/audit-log-filters";
import { AUTH_SESSION_UPDATED_EVENT, loadActiveAuthSession, type AuthSession } from "@/lib/auth-session";
import { formatDate, formatDateTime } from "@/lib/format";
import { presentUserDisplayName } from "@/lib/present-user-label";
import { pushToast } from "@/lib/toast";

type AccessState = "checking" | "allowed" | "unauthorized" | "forbidden";
interface SuccessfulResult { filters: AuditLogFilters; data: AuditLogPage }
interface PendingQuery { filters: AuditLogFilters; page: number; size: number }
interface ActorOption { id: number; name: string; email: string }

function actorLabel(item: AuditLogItem) {
  return item.actorId === null ? "Hệ thống/không rõ"
    : presentUserDisplayName(item.actorName ?? "") || item.actorEmail || `Tài khoản #${item.actorId}`;
}

export function BackofficeAuditPageClient() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [principalId, setPrincipalId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AuditLogFilters>(createDefaultAuditLogFilters);
  const [result, setResult] = useState<SuccessfulResult | null>(null);
  const [pending, setPending] = useState<PendingQuery | null>(null);
  const [failedQuery, setFailedQuery] = useState<PendingQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [actors, setActors] = useState<ActorOption[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const querySequence = useRef(0);
  const listController = useRef<AbortController | null>(null);
  const actionsController = useRef<AbortController | null>(null);
  const exportController = useRef<AbortController | null>(null);

  function cancelRequests() {
    querySequence.current++;
    listController.current?.abort();
    actionsController.current?.abort();
    exportController.current?.abort();
  }

  function denyAccess(nextAccess: "unauthorized" | "forbidden") {
    cancelRequests();
    sessionRef.current = null;
    setPrincipalId(null);
    setAccess(nextAccess);
    setResult(null);
    setActors([]);
    setActions([]);
    setPending(null);
    setFailedQuery(null);
    setExporting(false);
    setActionsLoading(false);
    setError(null);
    setExportError(null);
    setActionsError(null);
  }

  function handlesAccessError(failure: unknown) {
    if (failure instanceof ApiClientError && (failure.status === 401 || failure.status === 403)) {
      denyAccess(failure.status === 403 ? "forbidden" : "unauthorized");
      return true;
    }
    return false;
  }

  function samePrincipal(id: number) {
    const current = loadActiveAuthSession();
    return current?.user.id === id && current.user.permissions.includes("backoffice.admin");
  }

  useEffect(() => {
    function syncSession() {
      const current = loadActiveAuthSession();
      if (!current) { denyAccess("unauthorized"); return; }
      if (!current.user.permissions.includes("backoffice.admin")) { denyAccess("forbidden"); return; }
      if (sessionRef.current && sessionRef.current.user.id !== current.user.id) {
        cancelRequests();
        setResult(null);
        setActors([]);
        setActions([]);
        setPending(null);
        setFailedQuery(null);
        setExporting(false);
        setError(null);
        setExportError(null);
      }
      sessionRef.current = current;
      setAccess("allowed");
      setPrincipalId(current.user.id);
    }
    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, syncSession);
      cancelRequests();
    };
  }, []);

  async function loadQuery(query: PendingQuery) {
    const session = sessionRef.current;
    if (!session) return;
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    const sequence = ++querySequence.current;
    setPending(query);
    setFailedQuery(null);
    setError(null);
    setValidationError(null);
    setExportError(null);
    let attemptedQuery = query;
    try {
      let data = await fetchAuditLogs(session.accessToken, query.filters, query.page, query.size, controller.signal);
      if (query.page > 0 && query.page >= data.totalPages) {
        // Dữ liệu có thể bị ẩn giữa hai lần tải; chỉ điều chỉnh trang một lần, không lặp vô hạn.
        attemptedQuery = { ...query, page: Math.max(0, data.totalPages - 1) };
        data = await fetchAuditLogs(session.accessToken, attemptedQuery.filters, attemptedQuery.page, attemptedQuery.size, controller.signal);
      }
      if (controller.signal.aborted || sequence !== querySequence.current || !samePrincipal(session.user.id)) return;
      setResult({ filters: query.filters, data });
      setActors((previous) => {
        const options = new Map(previous.map((actor) => [actor.id, actor]));
        for (const item of data.items) {
          if (item.actorId !== null) options.set(item.actorId, { id: item.actorId, name: actorLabel(item), email: item.actorEmail ?? "" });
        }
        return [...options.values()];
      });
    } catch (failure) {
      if (controller.signal.aborted || sequence !== querySequence.current) return;
      if (!handlesAccessError(failure)) {
        setFailedQuery(attemptedQuery);
        setError(resolveApiClientErrorMessage(failure, "Không thể tải nhật ký kiểm toán."));
      }
    } finally {
      if (!controller.signal.aborted && sequence === querySequence.current) setPending(null);
    }
  }

  async function loadActions() {
    const session = sessionRef.current;
    if (!session) return;
    actionsController.current?.abort();
    const controller = new AbortController();
    actionsController.current = controller;
    setActionsLoading(true);
    setActionsError(null);
    try {
      const next = await fetchAuditLogActions(session.accessToken, controller.signal);
      if (!controller.signal.aborted && samePrincipal(session.user.id)) setActions(next);
    } catch (failure) {
      if (!controller.signal.aborted && !handlesAccessError(failure)) {
        setActionsError(resolveApiClientErrorMessage(failure, "Không thể tải danh sách hành động."));
      }
    } finally {
      if (!controller.signal.aborted) setActionsLoading(false);
    }
  }

  useEffect(() => {
    if (principalId === null) return;
    const defaults = createDefaultAuditLogFilters();
    setDraft(defaults);
    void loadQuery({ filters: defaults, page: 0, size: 20 });
    void loadActions();
  }, [principalId]);

  const groups = useMemo(() => getAuditActionGroups(actions), [actions]);
  const visibleActions = useMemo(() => getAuditActionsInGroup(actions, draft.actionPrefix), [actions, draft.actionPrefix]);
  const busy = pending !== null || exporting;
  const dirty = result !== null && JSON.stringify(normalizeAuditLogFilters(draft)) !== JSON.stringify(result.filters);

  function updateDraft<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setValidationError(null);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = normalizeAuditLogFilters(draft);
    const message = validateAuditLogFilters(next);
    if (message) { setValidationError(message); return; }
    void loadQuery({ filters: next, page: 0, size: result?.data.size ?? 20 });
  }

  function resetFilters() {
    const defaults = createDefaultAuditLogFilters();
    setDraft(defaults);
    void loadQuery({ filters: defaults, page: 0, size: 20 });
  }

  async function exportCsv() {
    const session = sessionRef.current;
    if (!session || !result || busy) return;
    const message = validateAuditLogFilters(result.filters, true);
    if (message) { setExportError(message); return; }
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true);
    setExportError(null);
    try {
      const file = await downloadAuditLogCsv(session.accessToken, result.filters, controller.signal);
      if (controller.signal.aborted || !samePrincipal(session.user.id)) return;
      startAuditCsvDownload(file);
      if (file.truncated) {
        pushToast({ title: "CSV đã bị giới hạn", message: "Kết quả đã bị cắt ở 10.000 dòng. Hãy thu hẹp bộ lọc.", tone: "warning" });
      } else if (file.warning) {
        pushToast({ title: "Lưu ý khi xuất CSV", message: file.warning, tone: "warning" });
      } else {
        pushToast({ title: "Đã bắt đầu tải CSV", message: "Trình duyệt đang xử lý yêu cầu tải tệp.", tone: "success" });
      }
    } catch (failure) {
      if (!controller.signal.aborted && !handlesAccessError(failure)) {
        setExportError(resolveApiClientErrorMessage(failure, "Không thể xuất nhật ký kiểm toán."));
      }
    } finally {
      if (!controller.signal.aborted) setExporting(false);
    }
  }

  if (access !== "allowed") {
    return <section className="section audit-log-page"><div className="container">
      <SectionHeading eyebrow="Backoffice quản trị" title="Nhật ký kiểm toán" level={1} />
      <article className={access === "checking" ? "booking-inline-info" : "booking-inline-error"} role={access === "checking" ? "status" : "alert"}>
        <strong>{access === "checking" ? "Đang kiểm tra phiên đăng nhập..." : access === "forbidden" ? "Bạn không có quyền xem nhật ký kiểm toán." : "Bạn cần đăng nhập lại để xem nhật ký kiểm toán."}</strong>
        {access === "unauthorized" ? <p><Link href="/login?redirectTo=%2Fbackoffice%2Faudit" className="button button-secondary">Đăng nhập</Link></p> : null}
        {access === "forbidden" ? <p><Link href="/backoffice">Quay lại Backoffice</Link></p> : null}
      </article>
    </div></section>;
  }

  return <section className="section audit-log-page"><div className="container">
    <SectionHeading eyebrow="Backoffice quản trị" title="Nhật ký kiểm toán"
      description="Tra cứu người thao tác, hành động và đối tượng theo giờ Việt Nam. Trang này chỉ dùng để xem và xuất nhật ký." level={1} />
    <form className="surface-card audit-log-filters" onSubmit={applyFilters} aria-label="Bộ lọc nhật ký">
      <div className="field-grid audit-log-filter-grid">
        <label className="field"><span>Người thao tác trong kết quả đã tải</span>
          <select aria-label="Người thao tác trong kết quả đã tải" value={draft.actorId} onChange={(event) => { updateDraft("actorId", event.target.value); updateDraft("actorKeyword", ""); }}>
            <option value="">Tất cả người thao tác</option><option value="none">Hệ thống/không rõ</option>
            {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}{actor.email ? ` — ${actor.email}` : ""}</option>)}
          </select>
        </label>
        <label className="field"><span>Tìm email hoặc tên người thao tác</span>
          <input value={draft.actorKeyword} onChange={(event) => { updateDraft("actorKeyword", event.target.value); updateDraft("actorId", ""); }} placeholder="Tìm trong toàn bộ nhật ký" />
        </label>
        <label className="field"><span>Nhóm hành động</span><select aria-label="Nhóm hành động" value={draft.actionPrefix} disabled={actionsLoading}
          onChange={(event) => { updateDraft("actionPrefix", event.target.value); updateDraft("action", ""); }}>
          <option value="">Tất cả nhóm</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}
        </select></label>
        <label className="field"><span>Hành động cụ thể</span><select aria-label="Hành động cụ thể" value={draft.action} disabled={actionsLoading} onChange={(event) => updateDraft("action", event.target.value)}>
          <option value="">Tất cả hành động</option>{visibleActions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select></label>
        <label className="field"><span>Loại đối tượng</span><input value={draft.targetType} onChange={(event) => updateDraft("targetType", event.target.value)} placeholder="So khớp chính xác" /></label>
        <label className="field"><span>Mã đối tượng</span><input value={draft.targetId} onChange={(event) => updateDraft("targetId", event.target.value)} placeholder="Chứa mã được nhập" /></label>
        <label className="field"><span>Từ ngày</span><DateField ariaLabel="Từ ngày" value={draft.from} max={draft.to || undefined} onChange={(value) => updateDraft("from", value)} /></label>
        <label className="field"><span>Đến ngày</span><DateField ariaLabel="Đến ngày" value={draft.to} min={draft.from || undefined} onChange={(value) => updateDraft("to", value)} /></label>
        <label className="field"><span>Từ khóa trong chi tiết</span><input value={draft.keyword} onChange={(event) => updateDraft("keyword", event.target.value)} placeholder="Tìm đúng cả ký tự %, _ và \\" /></label>
      </div>
      <label className="field-checkbox"><input type="checkbox" checked={draft.includeHidden} onChange={(event) => updateDraft("includeHidden", event.target.checked)} /><span>Hiện cả bản ghi đã ẩn</span></label>
      <div className="finance-action-row"><button className="button button-primary" type="submit" disabled={busy}>Áp dụng</button>
        <button className="button button-secondary" type="button" onClick={resetFilters} disabled={exporting}>Đặt lại</button>
        {pending ? <span role="status">Đang tải kết quả mới...</span> : null}
      </div>
      {validationError ? <p className="booking-inline-error" role="alert">{validationError}</p> : null}
      {actionsError ? <div className="booking-inline-error" role="alert"><p>{actionsError}</p><button className="button button-secondary" type="button" onClick={() => void loadActions()} disabled={actionsLoading}>Tải lại hành động</button></div> : null}
    </form>

    <article className="table-card audit-log-table-card" aria-busy={pending !== null}>
      <div className="finance-table-head"><div><h2>Kết quả tra cứu</h2>
        <p aria-live="polite">{result ? `${result.data.totalElements} bản ghi` : "Chưa có kết quả tải thành công"}</p>
        {result ? <p>Bộ lọc đang hiển thị: {Object.entries(result.filters).filter(([, value]) => Boolean(value)).map(([key, value]) => {
          const labels: Record<string, string> = { actorId: "Người thao tác", actorKeyword: "Tên/email", actionPrefix: "Nhóm", action: "Hành động", targetType: "Loại", targetId: "Mã", from: "Từ", to: "Đến", keyword: "Từ khóa", includeHidden: "Hiện log ẩn" };
          return `${labels[key]}: ${key === "from" || key === "to" ? formatDate(value as string) : value === true ? "Có" : value === "none" ? "Hệ thống/không rõ" : value}`;
        }).join(" · ")}</p> : null}
      </div><div className="finance-action-row">
        <button type="button" className="button button-secondary" disabled={busy || !result}
          onClick={() => result && void loadQuery({ filters: result.filters, page: result.data.page, size: result.data.size })}>Tải lại</button>
        <button type="button" className="button button-primary" disabled={busy || !result} onClick={() => void exportCsv()}>{exporting ? "Đang xuất CSV..." : "Xuất CSV"}</button>
      </div></div>
      {dirty ? <p className="booking-inline-info" role="status">Bạn đang chỉnh bộ lọc. Bảng và CSV vẫn dùng bộ lọc đang hiển thị cho đến khi Áp dụng thành công.</p> : null}
      {error ? <article className="booking-inline-error" role="alert"><strong>Không tải được kết quả mới</strong><p>{error}</p>{result ? <p>Đang giữ kết quả tải thành công trước đó và bộ lọc tương ứng.</p> : null}
        <button type="button" className="button button-secondary" disabled={busy || !failedQuery} onClick={() => failedQuery && void loadQuery(failedQuery)}>Thử lại</button>
      </article> : null}
      {exportError ? <article className="booking-inline-error" role="alert"><strong>Không thể xuất CSV</strong><p>{exportError}</p></article> : null}
      <div className="table-wrap"><table className="audit-log-table" data-mobile-stack="true"><caption className="ui-visually-hidden">Nhật ký kiểm toán theo bộ lọc đang hiển thị</caption>
        <thead><tr><th scope="col">Thời gian</th><th scope="col">Người thao tác</th><th scope="col">Hành động</th><th scope="col">Đối tượng</th><th scope="col">Chi tiết</th></tr></thead>
        <tbody>{result?.data.items.length ? result.data.items.map((item) => <tr key={item.id}>
          <td data-label="Thời gian"><time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>{item.hidden ? <span className="pill audit-log-hidden">Đã ẩn</span> : null}</td>
          <td data-label="Người thao tác"><div className="finance-cell-stack"><strong>{actorLabel(item)}</strong>{item.actorId !== null && item.actorEmail ? <span>{item.actorEmail}</span> : null}</div></td>
          <td data-label="Hành động">{item.action}</td><td data-label="Đối tượng"><div className="finance-cell-stack"><strong>{item.targetType}</strong><span>{item.targetId}</span></div></td>
          <td data-label="Chi tiết"><details className="audit-log-detail"><summary><span className="audit-log-detail-preview">{item.detail || "Không có chi tiết"}</span><small>Xem đầy đủ</small></summary><div className="audit-log-detail-full">{item.detail}</div></details></td>
        </tr>) : <tr><td colSpan={5}><article className="booking-inline-info" role="status"><strong>{pending && !result ? "Đang tải nhật ký..." : result ? "Không có bản ghi khớp bộ lọc" : "Chưa tải được nhật ký"}</strong></article></td></tr>}</tbody>
      </table></div>
      <div className="audit-log-pagination"><label className="field"><span>Số dòng mỗi trang</span><select value={result?.data.size ?? 20} disabled={busy || !result}
        onChange={(event) => result && void loadQuery({ filters: result.filters, page: 0, size: Number(event.target.value) })}>
        {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <nav className="finance-action-row" aria-label="Phân trang nhật ký"><button type="button" className="button button-secondary" disabled={busy || !result || result.data.page === 0}
          onClick={() => result && void loadQuery({ filters: result.filters, page: result.data.page - 1, size: result.data.size })}>Trang trước</button>
          <span aria-live="polite">{result?.data.totalPages ? `Trang ${result.data.page + 1} / ${result.data.totalPages}` : "Không có trang kết quả"}</span>
          <button type="button" className="button button-secondary" disabled={busy || !result || result.data.page + 1 >= result.data.totalPages}
            onClick={() => result && void loadQuery({ filters: result.filters, page: result.data.page + 1, size: result.data.size })}>Trang sau</button>
        </nav></div>
    </article>
  </div></section>;
}
