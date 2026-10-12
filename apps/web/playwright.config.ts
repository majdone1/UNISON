import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:43127',
    headless: true,
  },
  webServer: {
    command: 'pnpm --filter @unison/web dev',
    url: 'http://127.0.0.1:43127/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
