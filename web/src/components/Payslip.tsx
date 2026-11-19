import { formatMoney } from '../format';
import type { EvaluationResult, RubricResult } from '../types';
import { TraceTree } from './TraceTree';

interface Props {
  result: EvaluationResult;
  selected: string | null;
  onSelect: (code: string) => void;
}

export function Payslip({ result, selected, onSelect }: Props) {
  const earnings = result.rubrics.filter((r) => r.kind === 'Earning');
  const deductions = result.rubrics.filter((r) => r.kind === 'Deduction');
  const others = result.rubrics.filter((r) => r.kind === 'Base' || r.kind === 'Info');
  const current = result.rubrics.find((r) => r.code === selected) ?? result.rubrics[0];

  const row = (r: RubricResult) => (
    <tr key={r.code} className={r.code === current?.code ? 'selected' : undefined}>
      <th scope="row">
        <button
          type="button"
          className="link"
          aria-pressed={r.code === current?.code}
          onClick={() => onSelect(r.code)}
        >
          {r.description}
        </button>
      </th>
      <td className="num">{formatMoney(r.value)}</td>
    </tr>
  );

  return (
    <section className="panel" aria-labelledby="payslip-title">
      <h2 id="payslip-title">Holerite</h2>
      <div className="payslip">
        <table>
          <caption>Proventos</caption>
          <tbody>{earnings.map(row)}</tbody>
        </table>
        <table>
          <caption>Descontos</caption>
          <tbody>{deductions.map(row)}</tbody>
        </table>
      </div>
      {result.totals && (
        <dl className="totals">
          <div>
            <dt>Bruto</dt>
            <dd>{formatMoney(result.totals.earnings)}</dd>
          </div>
          <div>
            <dt>Descontos</dt>
            <dd>{formatMoney(result.totals.deductions)}</dd>
          </div>
          <div className="net">
            <dt>Líquido</dt>
            <dd data-testid="net">{formatMoney(result.totals.net)}</dd>
          </div>
        </dl>
      )}
      <table className="others">
        <caption>Bases e informativas</caption>
        <tbody>{others.map(row)}</tbody>
      </table>

      <h3>Ordem de cálculo</h3>
      <ol className="order">
        {result.order.map((code) => (
          <li key={code} className="mono">
            {code}
          </li>
        ))}
      </ol>

      {current && (
        <>
          <h3>
            Memória de cálculo · <span className="mono">{current.code}</span>
          </h3>
          <TraceTree node={current.trace} onNavigate={onSelect} />
        </>
      )}
    </section>
  );
}
