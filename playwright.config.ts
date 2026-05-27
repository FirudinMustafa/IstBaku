import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/report.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      // PU-03: `devices['iPhone 14']` defaults to WebKit. Override to actual Chromium
      // engine but keep the iPhone viewport/touch/isMobile profile, and patch the UA
      // string so any UA-sniffing code still sees a mobile Chrome signature.
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        userAgent: devices['iPhone 14'].userAgent?.replace(
          'Mobile/15E148',
          'Mobile/15E148 Chrome/120.0.0.0',
        ),
      },
    },
  ],
});
