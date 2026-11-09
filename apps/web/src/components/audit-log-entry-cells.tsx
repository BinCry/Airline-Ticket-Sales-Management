"use client";

import type { AuditLogItem } from "@/lib/audit-log-api";
import { getAuditActionLabel, getAuditDetailPresentation, getAuditTargetLabel } from "@/lib/audit-log-presentation";
import { pushToast } from "@/lib/toast";

export async function copyAuditLogValue(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    pushToast({ title: "Đã sao chép", message: label, tone: "success" });
  } catch {
    pushToast({ title: "Chưa sao chép được", message: "Hãy chọn nội dung gốc và sao chép bằng bàn phím hoặc menu của trình duyệt.", tone: "warning" });
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return <button type="button" className="button button-secondary audit-log-copy" disabled={!value}
    aria-label={`Sao chép ${label.toLowerCase()}`} onClick={() => void copyAuditLogValue(value, label)}>Sao chép</button>;
}

function AuditLogRawValues({ item }: { item: AuditLogItem }) {
  return <>
    <dl className="audit-log-technical-values">
      <dt>Mã hành động</dt><dd><code>{item.action}</code><CopyButton value={item.action} label="Mã hành động" /></dd>
      <dt>Loại đối tượng gốc</dt><dd><code>{item.targetType}</code><CopyButton value={item.targetType} label="Loại đối tượng gốc" /></dd>
      <dt>Mã đối tượng</dt><dd><code>{item.targetId}</code><CopyButton value={item.targetId} label="Mã đối tượng" /></dd>
    </dl>
    <div className="audit-log-raw-heading"><strong>Chi tiết gốc</strong><CopyButton value={item.detail} label="Chi tiết gốc" /></div>
    <pre className="audit-log-detail-full">{item.detail}</pre>
  </>;
}

export function AuditLogEntryCells({ item }: { item: AuditLogItem }) {
  const presentation = getAuditDetailPresentation(item);
  const hasDetail = Boolean(item.detail?.trim());
  return <>
    <td data-label="Hành động"><strong>{getAuditActionLabel(item.action)}</strong></td>
    <td data-label="Đối tượng"><div className="finance-cell-stack">
      <strong>{getAuditTargetLabel(item.targetType)}</strong>
      <span className="audit-log-target-id" title={item.targetId}>{item.targetId}</span>
    </div></td>
    <td data-label="Chi tiết">
      {presentation.warnings.length > 0 ? <ul className="audit-log-detail-notices" aria-label="Lưu ý về CSV">
        {presentation.warnings.map((warning) => <li key={warning.tone} className={`audit-log-detail-notice audit-log-detail-notice-${warning.tone}`}>{warning.message}</li>)}
      </ul> : null}
      <details className="audit-log-detail">
        <summary><span className="audit-log-detail-preview">{presentation.summary}</span><small>
          <span className="audit-log-detail-expand">{hasDetail ? "Xem đầy đủ" : "Xem mã kỹ thuật"}</span>
          <span className="audit-log-detail-collapse">Thu gọn</span>
        </small></summary>
        {hasDetail ? <details className="audit-log-raw">
          <summary>Xem dữ liệu gốc</summary>
          <AuditLogRawValues item={item} />
        </details> : <AuditLogRawValues item={item} />}
      </details>
    </td>
  </>;
}
