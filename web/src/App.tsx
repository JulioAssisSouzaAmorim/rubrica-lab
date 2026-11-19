import { useEffect, useState } from 'react';
import { api } from './api';
import { Payslip } from './components/Payslip';
import { SensitivityPanel } from './components/SensitivityPanel';
import { SheetEditor } from './components/SheetEditor';
import type { EvaluationResult, PayrollSheet } from './types';

export function App() {
  const [sheet, setSheet] = useState<PayrollSheet | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [lastGood, setLastGood] = useState<EvaluationResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .sample()
      .then(setSheet)
      .catch((e: unknown) => setError(`Não foi possível carregar o exemplo. ${String(e)}`));
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .evaluate(sheet, controller.signal)
        .then((evaluation) => {
          setResult(evaluation);
          if (evaluation.success) setLastGood(evaluation);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!controller.signal.aborted) setError(String(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [sheet]);

  const reset = () => {
    setSelected(null);
    api
      .sample()
      .then(setSheet)
      .catch((e: unknown) => setError(String(e)));
  };

  return (
    <>
      <header className="top">
        <div>
          <h1>Rubrica Lab</h1>
          <p>Folha de pagamento como código: fórmulas, grafo de dependências e memória de cálculo.</p>
        </div>
        <button type="button" className="ghost" onClick={reset}>
          Restaurar exemplo
        </button>
      </header>

      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}

      {sheet && (
        <main className="layout">
          <SheetEditor sheet={sheet} diagnostics={result?.diagnostics ?? []} onChange={setSheet} />
          {lastGood && (
            <div className={result?.success === false ? 'stale' : undefined}>
              {result?.success === false && <p className="stale-note">Mostrando o último cálculo válido.</p>}
              <Payslip result={lastGood} selected={selected} onSelect={setSelected} />
            </div>
          )}
          <SensitivityPanel sheet={sheet} enabled={result?.success === true} />
        </main>
      )}
    </>
  );
}
