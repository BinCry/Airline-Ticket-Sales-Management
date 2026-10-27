import { defineConfig } from "@playwright/test";

// Dùng bản build riêng đã kiểm tra; API được giả lập hoàn toàn trong bài test.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "audit-log.spec.ts",
  outputDir: `test-results/audit-log/${new Date().toISOString().replace(/[:.]/g, "-")}`,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:3101",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    serviceWorkers: "block"
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101",
    cwd: __dirname,
    url: "http://127.0.0.1:3101/login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_DIST_DIR: ".next", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:18999", NEXT_TELEMETRY_DISABLED: "1",
      GEMINI_API_KEY: " ", GOOGLE_GENERATIVE_AI_API_KEY: " ", NEWSDATA_API_KEY: " ", NEWSDATAIO_API_KEY: " ",
      OPENWEATHER_API_KEY: " ", OPEN_WEATHER_API_KEY: " "
    }
  }
});
