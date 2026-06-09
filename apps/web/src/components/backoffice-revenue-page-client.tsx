"use client";

import { useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { loadActiveAuthSession } from "@/lib/auth-session";
import {
  fetchBackofficeRevenueDashboard,
  type BackofficeRevenueDashboard,
  type BackofficeRevenueGranularity
} from "@/lib/backoffice-revenue-api";
import { formatCurrency } from "@/lib/format";

type RevenueState = "idle" | "loading" | "success" | "error";

const LINE_CHART_WIDTH = 960;
const LINE_CHART_HEIGHT = 320;
const LINE_CHART_PADDING = 36;

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

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} triệu`;
  }

  return formatCurrency(value);
}

function getCurrentMonthValue() {
  const currentDate = new Date();
  return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentYearValue() {
  return String(new Date().getFullYear());
}

function shiftMonthValue(value: string, monthOffset: number) {
  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
    return getCurrentMonthValue();
  }

  const nextDate = new Date(year, monthIndex + monthOffset, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function createFallbackDashboard(granularity: BackofficeRevenueGranularity): BackofficeRevenueDashboard {
  return {
    buckets: [],
    generatedAt: new Date().toISOString(),
    granularity,
    paidAmount: 0,
    periodLabel: granularity === "day" ? "Tháng hiện tại" : "Năm hiện tại",
    refundedAmount: 0,
    refundedTicketCount: 0,
    soldTicketCount: 0,
    totalRevenue: 0
  };
}

export function BackofficeRevenuePageClient() {
  const [state, setState] = useState<RevenueState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<BackofficeRevenueGranularity>("day");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [selectedYear, setSelectedYear] = useState(getCurrentYearValue);
  const [appliedYear, setAppliedYear] = useState(getCurrentYearValue);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState<BackofficeRevenueDashboard>(() =>
    createFallbackDashboard("day")
  );

  useEffect(() => {
    setAccessToken(loadActiveAuthSession()?.accessToken ?? null);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadDashboard(accessToken, granularity, resolveAppliedPeriod());
  }, [accessToken, granularity, selectedMonth, appliedYear, reloadKey]);

  const lineChart = useMemo(() => {
    const values = dashboard.buckets.map((bucket) => bucket.netRevenue);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const valueRange = Math.max(maxValue - minValue, 1);
    const plotWidth = LINE_CHART_WIDTH - LINE_CHART_PADDING * 2;
    const plotHeight = LINE_CHART_HEIGHT - LINE_CHART_PADDING * 2;
    const points = dashboard.buckets.map((bucket, index) => {
      const x = LINE_CHART_PADDING + (
        dashboard.buckets.length <= 1
          ? plotWidth / 2
          : (index / (dashboard.buckets.length - 1)) * plotWidth
      );
      const y = LINE_CHART_PADDING + ((maxValue - bucket.netRevenue) / valueRange) * plotHeight;

      return {
        bucket,
        x: Math.round(x),
        y: Math.round(y)
      };
    });
    const linePath = buildLinePath(points);
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${LINE_CHART_HEIGHT - LINE_CHART_PADDING} L ${points[0].x} ${
        LINE_CHART_HEIGHT - LINE_CHART_PADDING
      } Z`
      : "";
    const zeroY = Math.round(LINE_CHART_PADDING + (maxValue / valueRange) * plotHeight);

    return {
      areaPath,
      linePath,
      points,
      zeroY
    };
  }, [dashboard.buckets]);

  async function loadDashboard(
    nextAccessToken: string,
    nextGranularity: BackofficeRevenueGranularity,
    nextPeriod: string
  ) {
    setState("loading");
    setErrorMessage(null);

    try {
      const nextDashboard = await fetchBackofficeRevenueDashboard(
        nextAccessToken,
        nextGranularity,
        nextPeriod
      );
      setDashboard(nextDashboard);
      setState("success");
    } catch (error) {
      setDashboard(createFallbackDashboard(nextGranularity));
      setErrorMessage(
        resolveApiClientErrorMessage(error, "Không thể tải dashboard doanh thu lúc này.")
      );
      setState("error");
    }
  }

  function resolveAppliedPeriod() {
    return granularity === "month" ? appliedYear : selectedMonth;
  }

  function normalizeSelectedYear() {
    return selectedYear.trim() || getCurrentYearValue();
  }

  function applySelectedPeriod() {
    if (granularity === "month") {
      const nextYear = normalizeSelectedYear();
      setSelectedYear(nextYear);
      if (nextYear !== appliedYear) {
        setAppliedYear(nextYear);
        return;
      }
    }

    setReloadKey((currentReloadKey) => currentReloadKey + 1);
  }

  function changeSelectedMonth(monthOffset: number) {
    setSelectedMonth((currentMonth) => shiftMonthValue(currentMonth, monthOffset));
  }

  const revenueSummaryLabel = granularity === "day"
    ? "Tổng doanh thu tháng này"
    : "Tổng doanh thu năm này";

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Backoffice vận hành"
          title="Dashboard quản lý doanh thu"
          description="Theo dõi doanh thu thực theo công thức tổng tiền vé đã thanh toán trừ tổng tiền vé đã hoàn tiền, gom nhóm theo thời gian để đội vận hành nắm biến động nhanh."
        />

        <div className="revenue-toolbar">
          <div>
            <span className="section-eyebrow">Kỳ thống kê</span>
            <strong>{dashboard.periodLabel}</strong>
            <small>Cập nhật: {formatDateTime(dashboard.generatedAt)}</small>
          </div>
          <div className="revenue-segmented-control" aria-label="Chọn cách nhóm doanh thu">
            <button
              type="button"
              className={granularity === "day" ? "is-active" : ""}
              onClick={() => setGranularity("day")}
            >
              Theo ngày
            </button>
            <button
              type="button"
              className={granularity === "month" ? "is-active" : ""}
              onClick={() => setGranularity("month")}
            >
              Theo tháng
            </button>
          </div>
          {granularity === "day" ? (
            <div className="revenue-month-switcher">
              <button
                type="button"
                className="revenue-month-button"
                aria-label="Tháng trước"
                onClick={() => changeSelectedMonth(-1)}
              >
                ‹
              </button>
              <label className="revenue-month-picker">
                <span>Chọn tháng</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value || getCurrentMonthValue())}
                />
              </label>
              <button
                type="button"
                className="revenue-month-button"
                aria-label="Tháng sau"
                onClick={() => changeSelectedMonth(1)}
              >
                ›
              </button>
            </div>
          ) : (
            <label className="revenue-month-picker">
              <span>Chọn năm</span>
              <input
                type="number"
                min="2000"
                max="2100"
                step="1"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySelectedPeriod();
                  }
                }}
              />
            </label>
          )}
          <button
            type="button"
            className="button button-secondary"
            disabled={!accessToken || state === "loading"}
            onClick={applySelectedPeriod}
          >
            {state === "loading" ? "Đang tải..." : "Tải lại"}
          </button>
        </div>

        {errorMessage ? (
          <article className="booking-inline-error">
            <strong>Không thể tải dữ liệu</strong>
            <p>{errorMessage}</p>
          </article>
        ) : null}

        <div className="revenue-metric-grid">
          <article className="surface-card revenue-metric-card revenue-metric-card-primary">
            <span>Tổng doanh thu thực</span>
            <strong>{formatCurrency(dashboard.totalRevenue)}</strong>
            <p>Đã trừ {formatCurrency(dashboard.refundedAmount)} hoàn tiền.</p>
          </article>
          <article className="surface-card revenue-metric-card">
            <span>Tổng tiền đã thanh toán</span>
            <strong>{formatCurrency(dashboard.paidAmount)}</strong>
            <p>{dashboard.soldTicketCount} vé đã bán trong kỳ.</p>
          </article>
          <article className="surface-card revenue-metric-card">
            <span>Số vé hoàn</span>
            <strong>{dashboard.refundedTicketCount}</strong>
            <p>Tổng hoàn tiền {formatCurrency(dashboard.refundedAmount)}.</p>
          </article>
        </div>

        <article className="table-card revenue-chart-card">
          <div className="finance-table-head">
            <div>
              <span className="section-eyebrow">Biểu đồ đường</span>
              <h3>Biến động doanh thu thực</h3>
              <p>
                Mỗi điểm thể hiện doanh thu thực của một nhóm thời gian trong {dashboard.periodLabel.toLowerCase()}. {revenueSummaryLabel}: {formatCurrency(dashboard.totalRevenue)}.
              </p>
            </div>
            <span className="pill">Doanh thu thực</span>
          </div>

          <div className={`revenue-chart revenue-chart-${dashboard.granularity}`}>
            {dashboard.buckets.length > 0 ? (
              <>
                <svg
                  className="revenue-line-chart"
                  viewBox={`0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`}
                  role="img"
                  aria-label={`Biểu đồ đường doanh thu thực trong ${dashboard.periodLabel.toLowerCase()}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="revenueLineFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line
                    className="revenue-line-zero"
                    x1={LINE_CHART_PADDING}
                    x2={LINE_CHART_WIDTH - LINE_CHART_PADDING}
                    y1={lineChart.zeroY}
                    y2={lineChart.zeroY}
                  />
                  <path className="revenue-line-area" d={lineChart.areaPath} />
                  <path className="revenue-line-path" d={lineChart.linePath} />
                </svg>
                <div className="revenue-chart-points">
                  {lineChart.points.map(({ bucket, x, y }) => (
                    <div
                      key={bucket.key}
                      className="revenue-chart-point"
                      style={{
                        left: `${(x / LINE_CHART_WIDTH) * 100}%`,
                        top: `${(y / LINE_CHART_HEIGHT) * 100}%`
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`${bucket.label}: ${formatCurrency(bucket.netRevenue)}`}
                      >
                        <span className="revenue-chart-dot" aria-hidden="true" />
                      </button>
                      <div className="revenue-chart-tooltip" role="status">
                        <span>{bucket.label}</span>
                        <strong>{formatCurrency(bucket.netRevenue)}</strong>
                        <small>Đã thanh toán: {formatCurrency(bucket.paidAmount)}</small>
                        <small>Đã hoàn tiền: {formatCurrency(bucket.refundedAmount)}</small>
                        <small>Vé bán: {bucket.soldTicketCount}</small>
                        <small>Vé hoàn: {bucket.refundedTicketCount}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="revenue-chart-labels">
                  {dashboard.buckets.map((bucket) => (
                    <span key={bucket.key}>
                      <strong>{bucket.label}</strong>
                      <small>{formatCompactCurrency(bucket.netRevenue)}</small>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <article className="booking-inline-info revenue-empty-state">
                <strong>{state === "loading" ? "Đang tải..." : "Chưa có dữ liệu doanh thu"}</strong>
                <p>
                  {state === "loading"
                    ? "Đang tổng hợp doanh thu thực từ booking và yêu cầu hoàn tiền."
                    : "Kỳ thống kê hiện tại chưa có vé đã thanh toán hoặc vé đã hoàn tiền."}
                </p>
              </article>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
