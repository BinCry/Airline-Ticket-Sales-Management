import { describe, expect, it } from "vitest";

import { OPTIONS, POST } from "@/app/api/copilotkit/route";

describe("copilot-runtime-route", () => {
  it("phan hoi duoc voi OPTIONS de tranh loi ket noi co ban", async () => {
    const response = await OPTIONS(
      new Request("http://localhost:3000/api/copilotkit", {
        method: "OPTIONS"
      })
    );

    expect(response.status).toBeLessThan(500);
  });

  it("khong vo route khi nhan POST sai envelope", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/copilotkit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
