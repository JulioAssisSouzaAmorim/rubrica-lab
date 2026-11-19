import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatAxisMoney, formatMoney, formatPercent } from '../format';
import type { PayrollSheet, SweepAnalysis } from '../types';
import { LineChart } from './LineChart';

interface Props {
  sheet: PayrollSheet;
  enabled: boolean;
}

export function SensitivityPanel({ sheet, enabled }: Props) {
  const names = Object.keys(sheet.inputs);
  const [input, setInput] = useState(names[0] ?? '');
  const [from, setFrom] = useState(1500);
  const [to, setTo] = useState(15000);
  const [analysis, setAnalysis] = useState<SweepAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = names.includes(input) ? input : (names[0] ?? '');

  useEffect(() => {
    if (!enabled || !selected || !(to > from)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .sweep({ sheet, input: selected, from, to, points: 120 }, controller.signal)
        .then((result) => {
          setAnalysis(result);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!controller.signal.aborted) setError(String(e));
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [sheet, selected, from, to, enabled]);

  const points = analysis?.points ?? [];
  const xs = points.map((p) => p.x);

  return (
    <section className="panel wide" aria-labelledby="sensitivity-title">
      <h2 id="sensitivity-title">
        <span className="step">4</span> Explore cenários
      </h2>
      <p className="hint">
        Escolha uma entrada e um intervalo: o gráfico mostra como bruto e líquido variam. As quinas na curva
        são as mudanças de faixa do INSS e do IRRF.
      </p>
      <div className="controls">
        <label>
          Variar
          <select value={selected} onChange={(e) => setInput(e.target.value)}>
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          De
          <input type="number" value={from} onChange={(e) => setFrom(e.target.valueAsNumber || 0)} />
        </label>
        <label>
          Até
          <input type="number" value={to} onChange={(e) => setTo(e.target.valueAsNumber || 0)} />
        </label>
      </div>

      {error && <p role="alert">{error}</p>}
      {analysis && !analysis.success && (
        <p role="alert">{analysis.diagnostics[0]?.message ?? 'Falha na análise.'}</p>
      )}

      {points.length > 1 && (
        <div className="charts">
          <LineChart
            title="Bruto e líquido"
            xs={xs}
            marker={sheet.inputs[selected]}
            formatX={formatAxisMoney}
            formatY={formatAxisMoney}
            formatTooltip={formatMoney}
            series={[
              {
                id: 'earnings',
                label: 'Bruto',
                color: 'var(--series-2)',
                values: points.map((p) => p.earnings),
              },
              { id: 'net', label: 'Líquido', color: 'var(--series-1)', values: points.map((p) => p.net) },
            ]}
          />
          <LineChart
            title={`Líquido ganho a cada R$ 1 a mais em ${selected}`}
            xs={xs}
            marker={sheet.inputs[selected]}
            yMin={0}
            formatX={formatAxisMoney}
            formatY={formatPercent}
            series={[
              {
                id: 'marginal',
                label: 'Líquido por R$ 1',
                color: 'var(--series-1)',
                values: points.map((p) => p.marginalRetained),
              },
            ]}
          />
          <details>
            <summary>Ver como tabela</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{selected}</th>
                    <th scope="col">Bruto</th>
                    <th scope="col">Líquido</th>
                    <th scope="col">Líquido por R$ 1</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.x}>
                      <td className="num">{formatMoney(p.x)}</td>
                      <td className="num">{formatMoney(p.earnings)}</td>
                      <td className="num">{formatMoney(p.net)}</td>
                      <td className="num">
                        {p.marginalRetained === null ? '—' : formatPercent(p.marginalRetained)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
