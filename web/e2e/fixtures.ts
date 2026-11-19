import { test as base, expect } from '@playwright/test';

interface Options {
  /** API statuses a test triggers on purpose, e.g. [409]. */
  allowedApiStatuses: number[];
}

/**
 * Every test fails if the page logs an error, throws, loses a request
 * or gets an unexpected 4xx/5xx from the API.
 */
export const test = base.extend<Options & { networkGuard: undefined }>({
  allowedApiStatuses: [[], { option: true }],
  networkGuard: [
    async ({ page, allowedApiStatuses }, use) => {
      const problems: string[] = [];

      page.on('console', (msg) => {
        // HTTP failures are judged by the response handler, which knows the allowed statuses
        if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
          problems.push(`console: ${msg.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`exceção: ${error.message}`));
      page.on('requestfailed', (request) => {
        const reason = request.failure()?.errorText ?? '';
        // aborted = a newer request replaced an older one (debounce/StrictMode), which is expected
        if (!/ABORTED|cancel/i.test(reason)) problems.push(`falha de rede: ${request.url()} (${reason})`);
      });
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (
          url.pathname.startsWith('/api/') &&
          response.status() >= 400 &&
          !allowedApiStatuses.includes(response.status())
        ) {
          problems.push(`HTTP ${response.status()}: ${response.request().method()} ${url.pathname}`);
        }
      });

      await use(undefined);
      expect(problems, 'erros de rede ou console durante o teste').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
