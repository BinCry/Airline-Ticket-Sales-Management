import { afterEach, describe, expect, it, vi } from "vitest";

import { getGeminiModel, getOpenWeatherApiKey } from "@/lib/server-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server-env", () => {
  it("dung gemini-3.6-flash lam mac dinh khi chua cau hinh model", () => {
    vi.stubEnv("GEMINI_MODEL", "");

    expect(getGeminiModel()).toBe("gemini-3.6-flash");
  });

  it("tra ve model Gemini da cau hinh khi co gia tri", () => {
    vi.stubEnv("GEMINI_MODEL", " gemini-3.6-pro ");

    expect(getGeminiModel()).toBe("gemini-3.6-pro");
  });

  it("uu tien bien moi truong OPENWEATHER_API_KEY", () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "primary-key");
    vi.stubEnv("OPEN_WEATHER_API_KEY", "secondary-key");

    expect(getOpenWeatherApiKey()).toBe("primary-key");
  });

  it("dung bien moi truong thay the khi bien chinh khong co", () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    vi.stubEnv("OPEN_WEATHER_API_KEY", "secondary-key");

    expect(getOpenWeatherApiKey()).toBe("secondary-key");
  });

  it("tra ve rong khi chua cau hinh khoa OpenWeather", () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    vi.stubEnv("OPEN_WEATHER_API_KEY", "");

    expect(getOpenWeatherApiKey()).toBe("");
  });
});
