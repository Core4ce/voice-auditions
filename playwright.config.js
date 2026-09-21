import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4173', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true },
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'npx http-server site -a 127.0.0.1 -p 4173 -c-1',
    url: 'http://127.0.0.1:4173', reuseExistingServer: true
  }
});
