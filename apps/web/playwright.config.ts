import { defineConfig, devices } from "@playwright/test";

const playwrightPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3100", 10);
const playwrightBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${playwrightPort}`;
const skipPlaywrightWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

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
  webServer: skipPlaywrightWebServer
    ? undefined
    : {
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
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "chromium-tablet",
      testMatch: /responsive-ui\.spec\.ts|visual-regression\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 }
      }
    },
    {
      name: "chromium-mobile",
      testMatch: /responsive-ui\.spec\.ts|visual-regression\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 }
      }
    },
    {
      name: "webkit-mobile",
      testMatch: /responsive-ui\.spec\.ts/,
      use: {
        ...devices["iPhone 13 Mini"],
        viewport: { width: 375, height: 812 }
      }
    }
  ]
});
