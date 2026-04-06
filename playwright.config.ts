import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
      testIgnore: /creepjs/,
      timeout: 30000,
    },
    {
      name: 'creepjs',
      use: { browserName: 'firefox' },
      testMatch: /creepjs.*\.spec\.ts$/,
      timeout: 120000,
    },
    {
      name: 'real-extension',
      use: { browserName: 'firefox' },
      testMatch: /real-extension-full\.spec\.ts$/,
      timeout: 420000,
    },
  ],
});
