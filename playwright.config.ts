/**
 * Playwright E2E Test Configuration
 *
 * IMPORTANT: E2E tests run on TEST PORTS, not dev ports.
 * This prevents conflicts with running dev servers.
 *
 * Test Ports (from CLAUDE.md — NEVER CHANGE):
 *   Website:   4000
 *   API:       4010
 *   Dashboard: 4020
 *
 * Dev Ports (for development — NOT used in tests):
 *   Website:   3000
 *   API:       3001
 *   Dashboard: 3002
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results',

  use: {
    /* Base URL for E2E tests — uses TEST port, not dev port */
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: 'tests/e2e/.auth/user.json',
  },

  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'] },
        },
      ],

  /* Single Next.js app serves all pages and API routes */
  webServer: [
    {
      command: 'pnpm dev:test:website',
      url: 'http://localhost:4000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NEXT_PUBLIC_SITE_URL: 'http://localhost:4000',
        AUTH_SECRET: process.env.AUTH_SECRET ?? 'test-secret-for-ci-only-not-used-in-prod',
        AUTH_PASSWORD: process.env.AUTH_PASSWORD ?? 'testpassword',
      },
    },
  ],
});
