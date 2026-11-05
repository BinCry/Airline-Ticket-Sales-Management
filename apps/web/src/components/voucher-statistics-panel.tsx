"use client";

import { useEffect, useState } from "react";
import { DateField } from "@/components/date-field";
import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  fetchVoucherStats, formatVoucherStatsMoney, formatVoucherUsageRate, voucherStatusLabel,
  type VoucherStatsQuery, type VoucherStatsResponse, type VoucherStatsSummary
} from "@/lib/voucher-stats";
import styles from "./voucher-statistics.module.css";

export type VoucherStatsState = "idle" | "loading" | "success" | "error";

function Discounts({ summary }: { summary: VoucherStatsSummary }) {
  const currencies = Object.entries(summary.actualDiscountByCurrency);
  return <div className={styles.money}>
    {currencies.length ? currencies.map(([currency, amount]) =>
      <strong key={currency}>{formatVoucherStatsMoney(amount, currency)}</strong>
    ) : <p>Chưa có giá trị giảm đối chiếu được.</p>}
    {!summary.actualDiscountComplete ? <p className={styles.warning} role="status">
      Dữ liệu giảm giá chưa đầy đủ: {summary.unmatchedUsedCount.toLocaleString("vi-VN")} voucher USED chưa đối chiếu được dữ liệu booking.
    </p> : null}
  </div>;
}

export function VoucherStatsView({ state, data, error }: {
  state: VoucherStatsState; data: VoucherStatsResponse | null; error: string | null;
}) {
  if (state === "loading") return <p role="status">Đang tải thống kê voucher…</p>;
  if (state === "error") return <div className="booking-inline-error" role="alert">
    <strong>Không thể tải thống kê voucher</strong><p>{error}</p>
    <p>Chỉnh bộ lọc hoặc chọn “Xem thống kê” để tải lại.</p>
  </div>;
  if (state !== "success" || !data) return <p>Đăng nhập bằng tài khoản có quyền vận hành để xem thống kê.</p>;
  const total = data.summary;
  const maximum = data.byMonth.reduce((value, item) => Math.max(value, item.summary.totalVouchers), 1);
  return <div className={styles.content}>
    <div className={styles.note}>
      <p><strong>Kỳ cấp voucher:</strong> {data.fromDate || data.toDate
        ? (data.fromDate ? formatDate(data.fromDate) : "Không giới hạn đầu kỳ") + " → "
          + (data.toDate ? formatDate(data.toDate) + " (bao gồm ngày này)" : "Không giới hạn cuối kỳ")
        : "Toàn bộ lịch sử cấp"}.</p>
      <p><strong>Số liệu tại:</strong> <time dateTime={data.asOf}>{formatDateTime(data.asOf)}</time> (giờ Việt Nam).</p>
      <p>Thống kê voucher cấp trong kỳ; trạng thái hiện hành và giá trị giảm ghi nhận trên booking đến thời điểm xem.
        Đây không phải chi phí giao dịch phát sinh trong kỳ, tiền đã đối soát hoặc chi phí ròng sau hoàn tiền.</p>
      <p>Tính cả voucher đã ẩn. Danh sách vận hành bên dưới loại trừ voucher đã ẩn nên có thể có tổng khác.</p>
    </div>
    {total.totalVouchers === 0 ? <p role="status">Không có voucher được cấp trong khoảng ngày đã chọn.</p> : null}
    <dl className={styles.metrics}>
      <div><dt>Tổng voucher đã cấp</dt><dd>{total.totalVouchers.toLocaleString("vi-VN")}</dd></div>
      <div><dt>Tỷ lệ sử dụng</dt><dd>{formatVoucherUsageRate(total.usageRate)}</dd>
        <small>USED / (tổng đã cấp − REVOKED); mẫu số: {total.usageDenominator.toLocaleString("vi-VN")}.</small></div>
      <div><dt>Đã ẩn khỏi Operations</dt><dd>{total.operationsHiddenCount.toLocaleString("vi-VN")}</dd></div>
    </dl>
    <dl className={styles.statuses}>
      {Object.entries(total.statusCounts).map(([status, value]) =>
        <div key={status}><dt>{voucherStatusLabel(status)}</dt><dd>{value.toLocaleString("vi-VN")}</dd></div>)}
    </dl>
    <section><h3>Giá trị giảm ghi nhận trên booking</h3><Discounts summary={total} />
      <p className={styles.note}>Hiển thị riêng từng currency của booking; không quy đổi hoặc cộng các loại tiền.</p>
    </section>
    <section><h3>Theo nguồn voucher</h3><div className={styles.sources}>
      {data.bySource.map(item => <article key={item.source} className={styles.source}>
        <h4>{item.source === "MANUAL" ? "Cấp thủ công" : item.source === "BIRTHDAY" ? "Quà sinh nhật" : item.source} ({item.source})</h4>
        <p>{item.summary.totalVouchers.toLocaleString("vi-VN")} đã cấp · {item.summary.statusCounts.USED.toLocaleString("vi-VN")} đã dùng</p>
        <p>Tỷ lệ sử dụng: {formatVoucherUsageRate(item.summary.usageRate)}</p>
        <Discounts summary={item.summary} />
      </article>)}
    </div></section>
    <section><h3>Voucher cấp theo tháng</h3>
      <p className={styles.note}>Theo tháng của ngày cấp thực tế, không phải tháng sử dụng hay năm trong mã sinh nhật.</p>
      {data.byMonth.length ? <div className={styles.chart} role="region" aria-label="Biểu đồ số voucher cấp theo tháng" tabIndex={0}>
        <ul>{data.byMonth.map(item => <li key={item.month}>
          <span>{item.month}</span>
          <span className={styles.track} aria-hidden="true"><span style={{ width: (item.summary.totalVouchers / maximum * 100) + "%" }} /></span>
          <span>{item.summary.totalVouchers.toLocaleString("vi-VN")} đã cấp · {item.summary.statusCounts.USED.toLocaleString("vi-VN")} đã dùng</span>
        </li>)}</ul>
      </div> : <p>Chưa có dữ liệu tháng cấp voucher.</p>}
    </section>
  </div>;
}

export function VoucherStatisticsPanel({ accessToken }: { accessToken: string | null }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState<VoucherStatsQuery>({});
  const [state, setState] = useState<VoucherStatsState>("idle");
  const [data, setData] = useState<VoucherStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!accessToken) { setData(null); setState("idle"); return; }
    const controller = new AbortController();
    let current = true;
    setData(null); setError(null); setState("loading");
    void fetchVoucherStats(accessToken, query, controller.signal).then(result => {
      if (current) { setData(result); setState("success"); }
    }).catch(reason => {
      if (current) { setData(null); setError(resolveApiClientErrorMessage(reason, "Không thể tải thống kê voucher.")); setState("error"); }
    });
    return () => { current = false; controller.abort(); };
  }, [accessToken, query]);
  return <article id="operations-voucher-statistics" className={"surface-card backoffice-operations-anchor " + styles.panel} aria-busy={state === "loading"}>
    <SectionHeading eyebrow="Thống kê voucher" title="Hiệu quả voucher theo kỳ cấp"
      description="Ngày lọc theo giờ Việt Nam, bao gồm toàn bộ ngày kết thúc. Để trống hai ngày để xem toàn bộ lịch sử." />
    <form className={styles.filters} onSubmit={event => { event.preventDefault(); setQuery({ fromDate, toDate }); }}>
      <label className="field"><span>Từ ngày cấp</span><DateField ariaLabel="Từ ngày cấp" value={fromDate} onChange={setFromDate} /></label>
      <label className="field"><span>Đến ngày cấp</span><DateField ariaLabel="Đến ngày cấp" value={toDate} onChange={setToDate} /></label>
      <div className={styles.actions}>
        <button className="button button-secondary" type="submit" disabled={!accessToken}>Xem thống kê</button>
        <button className="button button-ghost" type="button" disabled={!accessToken}
          onClick={() => { setFromDate(""); setToDate(""); setQuery({}); }}>Toàn bộ lịch sử</button>
      </div>
    </form>
    <VoucherStatsView state={state} data={data} error={error} />
  </article>;
}
