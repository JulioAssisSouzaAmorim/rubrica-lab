import type {
  EvaluationResult,
  FunctionInfo,
  Library,
  PayrollSheet,
  Rubric,
  SweepAnalysis,
  SweepRequest,
  TaxTable,
} from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Prefers the ProblemDetails "detail" so users see the server's explanation, not a status code. */
export function describeFailure(status: number, body: string): string {
  try {
    const problem = JSON.parse(body) as { detail?: unknown; title?: unknown };
    if (typeof problem.detail === 'string') return problem.detail;
    if (typeof problem.title === 'string') return problem.title;
  } catch {
    // not JSON
  }
  return `O servidor respondeu ${status}${body ? `: ${body.slice(0, 200)}` : ''}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (e) {
    if (init.signal?.aborted) throw e;
    throw new ApiError(0, 'Não foi possível falar com o servidor. Ele está rodando?');
  }
  if (!response.ok) {
    throw new ApiError(response.status, describeFailure(response.status, await response.text()));
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const post = <T>(path: string, body: unknown, signal?: AbortSignal) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

const remove = (path: string) => request<undefined>(path, { method: 'DELETE' });

export const api = {
  sample: () => request<PayrollSheet>('/api/samples/clt-2025'),
  functions: () => request<FunctionInfo[]>('/api/functions'),
  evaluate: (sheet: PayrollSheet, signal?: AbortSignal) =>
    post<EvaluationResult>('/api/evaluate', sheet, signal),
  sweep: (body: SweepRequest, signal?: AbortSignal) =>
    post<SweepAnalysis>('/api/sensitivity/sweep', body, signal),
  library: () => request<Library>('/api/library'),
  saveRubric: (rubric: Rubric) => post<undefined>('/api/library/rubrics', rubric),
  deleteRubric: (code: string) => remove(`/api/library/rubrics/${encodeURIComponent(code)}`),
  saveTable: (table: TaxTable) => post<undefined>('/api/library/tables', table),
  deleteTable: (code: string) => remove(`/api/library/tables/${encodeURIComponent(code)}`),
};
