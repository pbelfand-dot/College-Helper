import { defineConfig } from '@playwright/test';

/**
 * The packaged desktop app has its own config because it needs none of the
 * browser one: no `webServer` (the app starts its own), no `baseURL` (the port
 * is chosen at runtime), and no Chromium (Electron brings its own).
 *
 * Serial by construction — the tests share one data directory on purpose, so
 * that "quit and reopen" is a real quit and a real reopen.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /desktop\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // Electron boots Chromium and then a Next server; the first launch is slow.
  timeout: 180_000,
  expect: { timeout: 15_000 },
});
