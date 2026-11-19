import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5273',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'dotnet run --project ../src/RubricaLab.Api --no-launch-profile --urls http://localhost:5180',
      url: 'http://localhost:5180/api/health',
      reuseExistingServer: !ci,
      timeout: 120_000,
      env: { ASPNETCORE_ENVIRONMENT: 'Development', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5273',
      reuseExistingServer: !ci,
      timeout: 60_000,
    },
  ],
});
