import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env.CI;
// Points the suite at an already running app (e.g. the built one served by the API) instead of dev servers.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: external ?? 'http://localhost:5273',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? []
    : [
        {
          command:
            'dotnet run --project ../src/RubricaLab.Api --no-launch-profile --urls http://localhost:5180',
          url: 'http://localhost:5180/api/health',
          reuseExistingServer: !ci,
          timeout: 120_000,
          env: {
            ASPNETCORE_ENVIRONMENT: 'Development',
            DOTNET_CLI_TELEMETRY_OPTOUT: '1',
            Library__Path: join(tmpdir(), `rubrica-lab-e2e-${Date.now()}.json`),
          },
        },
        {
          command: 'npm run dev',
          url: 'http://localhost:5273',
          reuseExistingServer: !ci,
          timeout: 60_000,
        },
      ],
});
