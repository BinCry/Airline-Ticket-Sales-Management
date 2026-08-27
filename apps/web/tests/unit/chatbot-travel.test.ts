import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildWeatherPromptContextMock,
  formatWeatherSummaryMock,
  getGeminiApiKeyMock,
  getGeminiModelMock,
  getWeatherSnapshotMock,
  isWeatherQuestionMock
} = vi.hoisted(() => ({
  buildWeatherPromptContextMock: vi.fn(),
  formatWeatherSummaryMock: vi.fn(),
  getGeminiApiKeyMock: vi.fn(() => "gemini-test-key"),
  getGeminiModelMock: vi.fn(() => "gemini-3.6-flash"),
  getWeatherSnapshotMock: vi.fn(),
  isWeatherQuestionMock: vi.fn()
}));

vi.mock("@/lib/chatbot-weather", () => ({
  buildWeatherPromptContext: buildWeatherPromptContextMock,
  detectWeatherLocation: vi.fn(),
  formatWeatherSummary: formatWeatherSummaryMock,
  getWeatherSnapshot: getWeatherSnapshotMock,
  isWeatherQuestion: isWeatherQuestionMock
}));

vi.mock("@/lib/public-content", () => ({
  destinations: []
}));

vi.mock("@/lib/server-env", () => ({
  getGeminiApiKey: getGeminiApiKeyMock,
  getGeminiModel: getGeminiModelMock
}));

import { buildTravelReply } from "@/lib/chatbot-travel";

describe("chatbot-travel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    buildWeatherPromptContextMock.mockReset();
    formatWeatherSummaryMock.mockReset();
    getGeminiApiKeyMock.mockReset();
    getGeminiApiKeyMock.mockReturnValue("gemini-test-key");
    getGeminiModelMock.mockReset();
    getGeminiModelMock.mockReturnValue("gemini-3.6-flash");
    getWeatherSnapshotMock.mockReset();
    isWeatherQuestionMock.mockReset();
  });

  it("tra thang du lieu thoi tiet da xac thuc ma khong goi Gemini", async () => {
    getWeatherSnapshotMock.mockResolvedValue({
      city: "Ha Noi",
      description: "may cum",
      feelsLikeC: 26,
      humidity: 75,
      observedAt: "21/03/2026 09:30",
      temperatureC: 24,
      windSpeed: 2.5
    });
    isWeatherQuestionMock.mockReturnValue(true);
    formatWeatherSummaryMock.mockReturnValue(
      "Thoi tiet hien tai tai Ha Noi: may cum, 24°C."
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await buildTravelReply([
      {
        role: "user",
        content: "Thoi tiet Ha Noi hom nay the nao?"
      }
    ]);

    expect(response.reply).toContain(
      "Thoi tiet hien tai tai Ha Noi: may cum, 24°C."
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("gui payload phu hop gemini-3.6-flash", async () => {
    getWeatherSnapshotMock.mockResolvedValue(null);
    isWeatherQuestionMock.mockReturnValue(false);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "OK" }]
              }
            }
          ]
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 200
        }
      )
    );

    const response = await buildTravelReply([
      {
        role: "user",
        content: "Goi y di bien cuoi tuan"
      }
    ]);

    expect(response.reply).toBe("OK");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "gemini-test-key"
        },
        method: "POST"
      })
    );

    const request = fetchSpy.mock.calls[0]?.[1];
    expect(request).toBeDefined();

    const payload = JSON.parse(String(request?.body)) as {
      generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
        topP?: number;
        thinkingConfig?: {
          thinkingLevel?: string;
        };
      };
    };

    expect(payload.generationConfig?.maxOutputTokens).toBe(360);
    expect(payload.generationConfig?.thinkingConfig?.thinkingLevel).toBe(
      "minimal"
    );
    expect(payload.generationConfig).not.toHaveProperty("temperature");
    expect(payload.generationConfig).not.toHaveProperty("topP");
  });
});
