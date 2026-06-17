import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchBackofficeRevenueDashboard } from "@/lib/backoffice-revenue-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("backoffice-revenue-api", () => {
  it("gui fromDate va toDate khi loc doanh thu theo khoang ngay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          granularity: "day",
          periodLabel: "Từ 01/06/2026 đến 15/06/2026",
          generatedAt: "2026-06-15T09:00:00+07:00",
          totalRevenue: 2500000,
          paidAmount: 3000000,
          refundedAmount: 500000,
          soldTicketCount: 3,
          refundedTicketCount: 1,
          buckets: [
            {
              key: "2026-06-01",
              label: "01/06",
              paidAmount: 3000000,
              refundedAmount: 500000,
              netRevenue: 2500000,
              soldTicketCount: 3,
              refundedTicketCount: 1
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
    );

    global.fetch = fetchMock as typeof fetch;

    await expect(
      fetchBackofficeRevenueDashboard("token-hop-le", {
        granularity: "day",
        fromDate: "2026-06-01",
        toDate: "2026-06-15"
      })
    ).resolves.toMatchObject({
      granularity: "day",
      totalRevenue: 2500000
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:8080/api/backoffice/operations/revenue?granularity=day&fromDate=2026-06-01&toDate=2026-06-15"
    );
    const requestHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(requestHeaders.get("Authorization")).toBe("Bearer token-hop-le");
  });
});
