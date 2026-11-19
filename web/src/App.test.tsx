import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { api, ApiError, describeFailure } from './api';
import { App } from './App';
import { evaluation, failedEvaluation, sheet, sweep } from './test/fixtures';
import type { Library, PayrollSheet } from './types';

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const library: Library = {
  rubrics: [
    { rubric: sheet.rubrics[0]!, builtIn: true },
    { rubric: { code: 'BONUS', description: 'Bônus', kind: 'Earning', formula: '100' }, builtIn: false },
  ],
  tables: [{ table: sheet.tables[0]!, builtIn: true }],
};

describe('App', () => {
  let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/samples/clt-2025') return json(sheet);
      if (url === '/api/functions') return json([]);
      if (url === '/api/library') return json(library);
      if (url.startsWith('/api/library/')) return Promise.resolve(new Response(null, { status: 204 }));
      if (url === '/api/sensitivity/sweep') return json(sweep);
      const body = JSON.parse(init?.body as string) as PayrollSheet;
      return json(body.rubrics.some((r) => r.formula.includes('SALARO')) ? failedEvaluation : evaluation);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const calls = (url: string) => fetchMock.mock.calls.filter(([u]) => u === url);

  it('loads the sample, evaluates it and draws the sensitivity charts', async () => {
    render(<App />);

    expect(await screen.findByTestId('net')).toHaveTextContent('900,00');
    expect(await screen.findByRole('img', { name: 'Bruto e líquido' })).toBeInTheDocument();
    expect(JSON.parse(calls('/api/sensitivity/sweep')[0]?.[1]?.body as string)).toMatchObject({
      input: 'SALARIO_BASE',
      points: 120,
    });
  });

  it('keeps the last good payslip and points at the error while a formula is broken', async () => {
    render(<App />);
    await screen.findByTestId('net');

    fireEvent.change(screen.getByLabelText('Fórmula de INSS'), { target: { value: 'SALARO * 10%' } });

    expect(await screen.findByText('SALARO', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText(/Mostrando o último cálculo válido/)).toBeInTheDocument();
    expect(screen.getByTestId('net')).toHaveTextContent('900,00');
  });

  it('explains when the server is unreachable and offers a retry', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByTestId('net')).toHaveTextContent('900,00');
  });

  it('saves to the library, brings items back and deletes them', async () => {
    render(<App />);
    await screen.findByTestId('net');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar INSS na biblioteca' }));
    expect(await screen.findByText('INSS salva na biblioteca.')).toBeInTheDocument();
    expect(calls('/api/library/rubrics')[0]?.[1]?.method).toBe('POST');

    await userEvent.click(await screen.findByRole('button', { name: 'Usar rubrica BONUS' }));
    expect(screen.getByLabelText('Fórmula de BONUS')).toHaveValue('100');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir rubrica BONUS' }));
    expect(await screen.findByText('BONUS excluída da biblioteca.')).toBeInTheDocument();
    expect(calls('/api/library/rubrics/BONUS')[0]?.[1]?.method).toBe('DELETE');
  });

  it('shows server errors from the library as a toast', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/library/tables') return json({ detail: "'T' é uma tabela padrão." }, 409);
      if (url === '/api/library') return json(library);
      if (url === '/api/samples/clt-2025') return json(sheet);
      if (url === '/api/functions') return json([]);
      return json(url === '/api/sensitivity/sweep' ? sweep : evaluation);
    });
    render(<App />);
    await screen.findByTestId('net');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar tabela T na biblioteca' }));

    expect(await screen.findByText("'T' é uma tabela padrão.")).toBeInTheDocument();
  });

  it('hides the guide and remembers it', async () => {
    const { unmount } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Entendi, esconder' }));
    expect(screen.queryByText(/Bem-vindo/)).not.toBeInTheDocument();
    unmount();

    render(<App />);
    expect(screen.queryByText(/Bem-vindo/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Como usar' }));
    expect(screen.getByText(/Bem-vindo/)).toBeInTheDocument();
  });

  it('restores the sample on demand', async () => {
    render(<App />);
    await screen.findByTestId('net');

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar exemplo' }));

    await waitFor(() => expect(calls('/api/samples/clt-2025')).toHaveLength(2));
  });
});

describe('api', () => {
  it('prefers the ProblemDetails detail, then title, then status', () => {
    expect(describeFailure(409, '{"detail":"padrão"}')).toBe('padrão');
    expect(describeFailure(400, '{"title":"Bad"}')).toBe('Bad');
    expect(describeFailure(500, 'boom')).toBe('O servidor respondeu 500: boom');
    expect(describeFailure(502, '')).toBe('O servidor respondeu 502');
  });

  it('keeps the HTTP status on errors', async () => {
    vi.stubGlobal('fetch', () => json({ detail: 'não encontrado' }, 404));
    await expect(api.deleteRubric('X')).rejects.toEqual(new ApiError(404, 'não encontrado'));
    vi.unstubAllGlobals();
  });
});
