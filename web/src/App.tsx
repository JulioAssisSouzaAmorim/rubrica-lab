import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { Guide } from './components/Guide';
import { LibraryPanel } from './components/LibraryPanel';
import { Payslip } from './components/Payslip';
import { SensitivityPanel } from './components/SensitivityPanel';
import { SheetEditor } from './components/SheetEditor';
import type { EvaluationResult, FunctionInfo, Library, PayrollSheet, Rubric, TaxTable } from './types';

interface Toast {
  kind: 'ok' | 'error';
  text: string;
}

const GUIDE_KEY = 'rubrica-lab:guide-hidden';

const readGuideHidden = () => {
  try {
    return localStorage.getItem(GUIDE_KEY) === '1';
  } catch {
    return false;
  }
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function App() {
  const [sheet, setSheet] = useState<PayrollSheet | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [lastGood, setLastGood] = useState<EvaluationResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [guideHidden, setGuideHidden] = useState(readGuideHidden);

  const notify = useCallback((kind: Toast['kind'], text: string) => setToast({ kind, text }), []);

  const loadSample = useCallback(() => {
    api
      .sample()
      .then((sample) => {
        setSelected(null);
        setSheet(sample);
        setError(null);
      })
      .catch((e: unknown) => setError(`Não foi possível carregar o exemplo. ${message(e)}`));
  }, []);

  const refreshLibrary = useCallback(() => {
    api
      .library()
      .then(setLibrary)
      .catch((e: unknown) => notify('error', `Biblioteca indisponível: ${message(e)}`));
  }, [notify]);

  useEffect(() => {
    loadSample();
    refreshLibrary();
    api
      .functions()
      .then(setFunctions)
      .catch(() => setFunctions([]));
  }, [loadSample, refreshLibrary]);

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
          if (!controller.signal.aborted) setError(message(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [sheet]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const hideGuide = (hidden: boolean) => {
    setGuideHidden(hidden);
    try {
      localStorage.setItem(GUIDE_KEY, hidden ? '1' : '0');
    } catch {
      // storage unavailable: the choice just won't persist
    }
  };

  const libraryAction = (action: Promise<unknown>, success: string) => {
    action
      .then(() => {
        notify('ok', success);
        refreshLibrary();
      })
      .catch((e: unknown) => notify('error', message(e)));
  };

  const bringRubric = (rubric: Rubric) => {
    if (!sheet) return;
    const exists = sheet.rubrics.some((r) => r.code.toUpperCase() === rubric.code.toUpperCase());
    setSheet({
      ...sheet,
      rubrics: exists
        ? sheet.rubrics.map((r) => (r.code.toUpperCase() === rubric.code.toUpperCase() ? rubric : r))
        : [...sheet.rubrics, rubric],
    });
    notify('ok', exists ? `${rubric.code} substituída na folha.` : `${rubric.code} adicionada à folha.`);
  };

  const bringTable = (table: TaxTable) => {
    if (!sheet) return;
    const exists = sheet.tables.some((t) => t.code.toUpperCase() === table.code.toUpperCase());
    setSheet({
      ...sheet,
      tables: exists
        ? sheet.tables.map((t) => (t.code.toUpperCase() === table.code.toUpperCase() ? table : t))
        : [...sheet.tables, table],
    });
    notify('ok', exists ? `${table.code} substituída na folha.` : `${table.code} adicionada à folha.`);
  };

  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            R$
          </span>
          <div>
            <h1>Rubrica Lab</h1>
            <p>Folha de pagamento como código, com cada valor explicado.</p>
          </div>
        </div>
        <div className="top-actions">
          {guideHidden && (
            <button type="button" className="ghost" onClick={() => hideGuide(false)}>
              Como usar
            </button>
          )}
          <button type="button" className="secondary" onClick={loadSample}>
            Restaurar exemplo
          </button>
        </div>
      </header>

      {!guideHidden && <Guide onClose={() => hideGuide(true)} />}

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" className="secondary" onClick={loadSample}>
            Tentar de novo
          </button>
        </div>
      )}

      {sheet && (
        <main className="layout">
          <SheetEditor
            sheet={sheet}
            diagnostics={result?.diagnostics ?? []}
            functions={functions}
            onChange={setSheet}
            onSaveRubric={(rubric) =>
              libraryAction(api.saveRubric(rubric), `${rubric.code} salva na biblioteca.`)
            }
            onSaveTable={(table) => libraryAction(api.saveTable(table), `${table.code} salva na biblioteca.`)}
          />
          <div>
            {lastGood ? (
              <div className={result?.success === false ? 'stale' : undefined}>
                {result?.success === false && (
                  <p className="stale-note">Há um erro na folha. Mostrando o último cálculo válido.</p>
                )}
                <Payslip result={lastGood} selected={selected} onSelect={setSelected} />
              </div>
            ) : (
              <section className="panel">
                <p className="hint">Calculando…</p>
              </section>
            )}
          </div>
          <LibraryPanel
            library={library}
            onUseRubric={bringRubric}
            onUseTable={bringTable}
            onDeleteRubric={(code) =>
              libraryAction(api.deleteRubric(code), `${code} excluída da biblioteca.`)
            }
            onDeleteTable={(code) => libraryAction(api.deleteTable(code), `${code} excluída da biblioteca.`)}
          />
          <SensitivityPanel sheet={sheet} enabled={result?.success === true} />
        </main>
      )}

      {toast && (
        <div className={`toast ${toast.kind}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}
    </>
  );
}
