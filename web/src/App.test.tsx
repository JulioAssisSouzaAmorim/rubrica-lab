import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ApiError } from './api';
import { App } from './App';
import { evaluation, failedEvaluation, sheet, sweep } from './test/fixtures';
import type { PayrollSheet } from './types';

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

describe('App', () => {
  let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>;

  beforeEach(() => {
    fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/samples/clt-2025') return json(sheet);
      if (url === '/api/sensitivity/sweep') return json(sweep);
      const body = JSON.parse(init?.body as string) as PayrollSheet;
      return json(body.rubrics.some((r) => r.formula.includes('SALARO')) ? failedEvaluation : evaluation);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads the sample, evaluates it and draws the sensitivity charts', async () => {
    render(<App />);

    expect(await screen.findByTestId('net')).toHaveTextContent('900,00');
    expect(await screen.findByRole('img', { name: 'Bruto e líquido' })).toBeInTheDocument();
    const sweepCall = fetchMock.mock.calls.find(([url]) => url === '/api/sensitivity/sweep');
    expect(JSON.parse(sweepCall?.[1]?.body as string)).toMatchObject({ input: 'SALARIO_BASE', points: 120 });
  });

  it('keeps the last good payslip and points at the error while a formula is broken', async () => {
    render(<App />);
    await screen.findByTestId('net');

    fireEvent.change(screen.getByLabelText('Fórmula de INSS'), { target: { value: 'SALARO * 10%' } });

    expect(await screen.findByText('SALARO', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText('Mostrando o último cálculo válido.')).toBeInTheDocument();
    expect(screen.getByTestId('net')).toHaveTextContent('900,00');
  });

  it('reports when the API is unreachable', async () => {
    fetchMock.mockImplementationOnce(() => json({ title: 'boom' }, 500));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o exemplo');
  });

  it('restores the sample on demand', async () => {
    render(<App />);
    await screen.findByTestId('net');

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar exemplo' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/samples/clt-2025')).toHaveLength(2),
    );
  });
});

describe('ApiError', () => {
  it('keeps the status and truncates the body', () => {
    const error = new ApiError(400, 'x'.repeat(500));
    expect(error.status).toBe(400);
    expect(error.message.length).toBeLessThan(240);
  });
});
