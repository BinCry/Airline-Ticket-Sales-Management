import { defineConfig, devices } from "@playwright/test";

const playwrightPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3100", 10);
const playwrightBaseURL = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: playwrightBaseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command:
      "npm run build && npm run prepare:standalone && node .next-e2e/standalone/apps/web/server.js",
    cwd: __dirname,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      PORT: String(playwrightPort)
    },
    url: playwrightBaseURL,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
