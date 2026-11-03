"use client";

import { useEffect, useId, useState } from "react";
import type { AirportOption } from "@qlvmb/shared-types";
import { DateField } from "@/components/date-field";
import { fetchAirportOptions } from "@/lib/airport-api";
import { buildVoucherConditions, createVoucherConditionDraft, VOUCHER_FARES, type VoucherConditionDraft } from "@/lib/voucher-conditions";
import styles from "@/components/voucher-conditions.module.css";

function AirportCodeField({ label, value, disabled, onChange }: {
  label: string; value: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const id = useId();
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (disabled || !value.trim()) { setOptions([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError(false);
      void fetchAirportOptions(value, controller.signal).then((items) => {
        if (!controller.signal.aborted) setOptions(items);
      }).catch(() => { if (!controller.signal.aborted) { setOptions([]); setError(true); } });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, disabled]);
  return <label className="field">
    <span>{label}</span>
    <input value={value} list={id} maxLength={8} autoComplete="off" disabled={disabled}
      onChange={(event) => onChange(event.target.value.toUpperCase())} placeholder="Ví dụ: SGN"
      aria-describedby={error ? id + "-error" : undefined} />
    <datalist id={id}>{options.map((option) => <option key={option.code} value={option.code}>
      {option.cityName} — {option.airportName}
    </option>)}</datalist>
    {error ? <small id={id + "-error"}>Chưa tải được gợi ý. Có thể nhập mã sân bay; hệ thống sẽ kiểm tra khi lưu.</small> : null}
  </label>;
}

export function VoucherConditionEditor({ value, onChange, disabled = false, readOnly = false, currency }: {
  value: VoucherConditionDraft; onChange: (value: VoucherConditionDraft) => void;
  disabled?: boolean; readOnly?: boolean; currency: string;
}) {
  const id = useId();
  let error = "";
  try { buildVoucherConditions(value); } catch (cause) { error = (cause as Error).message; }
  if (readOnly) return <p className={styles.note}>Điều kiện chỉ đọc: voucher đang giữ chỗ hoặc đã sử dụng không được chỉnh sửa.</p>;
  return <details className={styles.editor}>
    <summary>Thiết lập điều kiện bổ sung (tùy chọn)</summary>
    <p id={id} className={styles.note}>
      Bỏ trống nhóm nào thì không giới hạn nhóm đó. Các nhóm đã chọn phải đồng thời thỏa (VÀ);
      trong mỗi danh sách chỉ cần một giá trị (HOẶC). Tuyến, hạng vé và ngày phải cùng thỏa trên một chặng.
    </p>
    <fieldset disabled={disabled} aria-describedby={id} className={styles.fields}>
      <legend>Tuyến bay được áp dụng</legend>
      {value.routes.map((route, index) => <div className={styles.route} key={index}>
        <AirportCodeField label={`Sân bay đi tuyến ${index + 1}`} value={route.from} disabled={disabled}
          onChange={(from) => onChange({ ...value, routes: value.routes.map((item, position) => position === index ? { ...item, from } : item) })} />
        <AirportCodeField label={`Sân bay đến tuyến ${index + 1}`} value={route.to} disabled={disabled}
          onChange={(to) => onChange({ ...value, routes: value.routes.map((item, position) => position === index ? { ...item, to } : item) })} />
        <button type="button" className="button button-secondary" aria-label={`Xóa tuyến ${index + 1}`}
          onClick={() => onChange({ ...value, routes: value.routes.filter((_, position) => position !== index) })}>Xóa tuyến</button>
      </div>)}
      <button type="button" className="button button-secondary"
        onClick={() => onChange({ ...value, routes: [...value.routes, { from: "", to: "" }] })}>Thêm tuyến</button>
      <fieldset className={styles.fares}><legend>Hạng vé (bỏ trống để áp dụng mọi hạng)</legend>
        {VOUCHER_FARES.map((fare) => <label key={fare.value}>
          <input type="checkbox" checked={value.fareFamilies.includes(fare.value)}
            onChange={(event) => onChange({ ...value, fareFamilies: event.target.checked ?
              [...value.fareFamilies, fare.value] : value.fareFamilies.filter((item) => item !== fare.value) })} />
          {fare.label}
        </label>)}
      </fieldset>
      <div className="field-grid compact-grid">
        <label className="field"><span>Khởi hành từ ngày</span>
          <DateField value={value.departureFrom} onChange={(departureFrom) => onChange({ ...value, departureFrom })}
            disabled={disabled} max={value.departureTo || undefined} />
        </label>
        <label className="field"><span>Khởi hành đến ngày</span>
          <DateField value={value.departureTo} onChange={(departureTo) => onChange({ ...value, departureTo })}
            disabled={disabled} min={value.departureFrom || undefined} />
        </label>
        <label className="field"><span>Giá trị booking tối thiểu ({currency || "đơn vị tiền voucher"})</span>
          <input type="text" inputMode="numeric" value={value.minAmount} placeholder="Không giới hạn"
            onChange={(event) => onChange({ ...value, minAmount: event.target.value })} />
        </label>
      </div>
      <p className={styles.note}>Ngày theo giờ Việt Nam, gồm cả hai ngày biên; có thể chỉ chọn một mốc.
        Giá trị tối thiểu gồm vé và dịch vụ trước giảm. Voucher có điều kiện chỉ áp dụng khi booking cùng đơn vị tiền tệ.</p>
      <button type="button" className="button button-secondary"
        onClick={() => onChange(createVoucherConditionDraft())}>Xóa toàn bộ điều kiện</button>
    </fieldset>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <p className={styles.note}>Đây là bản nháp. Điều kiện chính thức và câu diễn giải sẽ được cập nhật sau khi lưu thành công.</p>
  </details>;
}
