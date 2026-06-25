import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Pre-stamp `dharma:onboarding-shown=true` for every test by default
    // so the first-launch Welcome dialog doesn't intercept clicks. This
    // matches the convention the lifecycle / feature-audit / visual-walk
    // specs already use inline; centralising it here repairs ~40 older
    // specs (m2.a11y, m3.a11y, m4*.a11y, etc.) that were authored before
    // the Welcome screen shipped (b20c2f7). Tests that intentionally
    // exercise the Welcome flow opt out with `test.use({ storageState:
    // undefined })` (see _visual-walk.spec.ts "cold boot + welcome").
    storageState: "./tests/e2e/.storage-state.json",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
    // mobile-safari (iPhone 14) is disabled in this environment: WebKit
    // binaries are not available. Re-enable once webkit is installed.
    // {
    //   name: "mobile-safari",
    //   use: { ...devices["iPhone 14"] },
    // },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
});
