import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchBackofficeRevenueDashboard } from "@/lib/backoffice-revenue-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("backoffice-revenue-api", () => {
  it("gui fromDate va toDate khi tai dashboard theo khoang ngay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          granularity: "day",
          periodLabel: "Từ 17/06/2026 đến 20/07/2026",
          generatedAt: "2026-06-17T10:15:00+07:00",
          totalRevenue: 1_500_000,
          paidAmount: 1_700_000,
          refundedAmount: 200_000,
          soldTicketCount: 4,
          refundedTicketCount: 1,
          buckets: []
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      fetchBackofficeRevenueDashboard("token-revenue", "day", {
        fromDate: "2026-06-17",
        toDate: "2026-07-20"
      })
    ).resolves.toMatchObject({
      granularity: "day",
      totalRevenue: 1_500_000
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/backoffice/operations/revenue?granularity=day&fromDate=2026-06-17&toDate=2026-07-20",
      expect.objectContaining({
        cache: "no-store"
      })
    );
  });

  it("giu kieu goi period khi tai dashboard theo nam", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          granularity: "month",
          periodLabel: "Năm 2026",
          generatedAt: "2026-06-17T10:15:00+07:00",
          totalRevenue: 12_000_000,
          paidAmount: 13_000_000,
          refundedAmount: 1_000_000,
          soldTicketCount: 32,
          refundedTicketCount: 3,
          buckets: []
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    global.fetch = fetchMock as typeof fetch;

    await fetchBackofficeRevenueDashboard("token-year", "month", {
      period: "2026"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/backoffice/operations/revenue?granularity=month&period=2026",
      expect.objectContaining({
        cache: "no-store"
      })
    );
  });
});
