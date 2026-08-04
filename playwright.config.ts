import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Some environments ship a Chromium build that does not match the revision this
 * Playwright version would download. Set PLAYWRIGHT_CHROMIUM_PATH to reuse it
 * instead of fetching another copy.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  /*
   * `desktop.spec.ts` belongs to the packaged Electron app and runs from
   * `playwright.desktop.config.ts` instead. Launching it from here would start
   * Electron with no display and no packaged build — it exists in this repo but
   * it is not a browser test.
   */
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
      testIgnore: [/mobile\.spec\.ts/, /desktop\.spec\.ts/],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], launchOptions: { executablePath } },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DEMO_MODE: 'true', AI_PROVIDER: 'mock' },
  },
});
