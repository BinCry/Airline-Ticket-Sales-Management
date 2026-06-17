import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchBackofficeRevenueDashboard } from "@/lib/backoffice-revenue-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("backoffice-revenue-api", () => {
  it("goi dashboard doanh thu theo khoang ngay", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          granularity: "day",
          periodLabel: "Từ 10/06/2026 đến 12/06/2026",
          generatedAt: "2026-06-12T10:00:00+07:00",
          totalRevenue: 1500000,
          paidAmount: 1800000,
          refundedAmount: 300000,
          soldTicketCount: 3,
          refundedTicketCount: 1,
          buckets: [
            {
              key: "2026-06-10",
              label: "10/06",
              paidAmount: 900000,
              refundedAmount: 0,
              netRevenue: 900000,
              soldTicketCount: 1,
              refundedTicketCount: 0
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      fetchBackofficeRevenueDashboard("member-token", "day", {
        fromDate: "2026-06-10",
        toDate: "2026-06-12"
      })
    ).resolves.toMatchObject({
      granularity: "day",
      totalRevenue: 1500000
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/backoffice/operations/revenue?granularity=day&fromDate=2026-06-10&toDate=2026-06-12",
      expect.any(Object)
    );
  });

  it("goi dashboard doanh thu theo nam khi xem theo thang", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          granularity: "month",
          periodLabel: "Năm 2026",
          generatedAt: "2026-06-12T10:00:00+07:00",
          totalRevenue: 4500000,
          paidAmount: 5000000,
          refundedAmount: 500000,
          soldTicketCount: 10,
          refundedTicketCount: 2,
          buckets: [
            {
              key: "2026-01",
              label: "Tháng 1",
              paidAmount: 500000,
              refundedAmount: 0,
              netRevenue: 500000,
              soldTicketCount: 1,
              refundedTicketCount: 0
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      fetchBackofficeRevenueDashboard("member-token", "month", {
        period: "2026"
      })
    ).resolves.toMatchObject({
      granularity: "month",
      periodLabel: "Năm 2026"
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/backoffice/operations/revenue?granularity=month&period=2026",
      expect.any(Object)
    );
  });
});
