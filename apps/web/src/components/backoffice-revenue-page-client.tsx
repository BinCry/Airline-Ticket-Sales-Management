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

    void loadDashboard(accessToken, granularity);
  }, [accessToken, granularity]);

  const maxBarValue = useMemo(() => {
    const maxBucketValue = Math.max(
      ...dashboard.buckets.map((bucket) => Math.abs(bucket.netRevenue)),
      0
    );
    return Math.max(maxBucketValue, 1);
  }, [dashboard.buckets]);

  async function loadDashboard(
    nextAccessToken: string,
    nextGranularity: BackofficeRevenueGranularity
  ) {
    setState("loading");
    setErrorMessage(null);

    try {
      const nextDashboard = await fetchBackofficeRevenueDashboard(nextAccessToken, nextGranularity);
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
          <button
            type="button"
            className="button button-secondary"
            disabled={!accessToken || state === "loading"}
            onClick={() => accessToken ? void loadDashboard(accessToken, granularity) : undefined}
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
              <span className="section-eyebrow">Biểu đồ cột</span>
              <h3>Biến động doanh thu thực</h3>
              <p>
                Mỗi cột thể hiện doanh thu thực của một nhóm thời gian trong {dashboard.periodLabel.toLowerCase()}.
              </p>
            </div>
            <span className="pill">Doanh thu thực</span>
          </div>

          <div className="revenue-chart">
            {dashboard.buckets.length > 0 ? (
              dashboard.buckets.map((bucket) => {
                const barHeight = Math.max(6, Math.round((Math.abs(bucket.netRevenue) / maxBarValue) * 100));
                const isNegative = bucket.netRevenue < 0;

                return (
                  <div key={bucket.key} className="revenue-chart-column">
                    <div className="revenue-chart-value">
                      {formatCompactCurrency(bucket.netRevenue)}
                    </div>
                    <div className="revenue-chart-track" aria-hidden="true">
                      <div
                        className={`revenue-chart-bar${isNegative ? " revenue-chart-bar-negative" : ""}`}
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <strong>{bucket.label}</strong>
                    <small>
                      Bán {bucket.soldTicketCount} / Hoàn {bucket.refundedTicketCount}
                    </small>
                  </div>
                );
              })
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
