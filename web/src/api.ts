import type { EvaluationResult, PayrollSheet, SweepAnalysis, SweepRequest } from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`API respondeu ${status}: ${body.slice(0, 200)}`);
  }
}

async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };
  if (signal) init.signal = signal;

  const response = await fetch(path, init);
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  return (await response.json()) as T;
}

export const api = {
  sample: () => request<PayrollSheet>('/api/samples/clt-2025'),
  evaluate: (sheet: PayrollSheet, signal?: AbortSignal) =>
    request<EvaluationResult>('/api/evaluate', sheet, signal),
  sweep: (body: SweepRequest, signal?: AbortSignal) =>
    request<SweepAnalysis>('/api/sensitivity/sweep', body, signal),
};
