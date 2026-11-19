import type { Diagnostic, PayrollSheet, Rubric, RubricKind } from '../types';
import { FormulaField } from './FormulaField';

const kinds: Record<RubricKind, string> = {
  Earning: 'Provento',
  Deduction: 'Desconto',
  Base: 'Base',
  Info: 'Informativa',
};

interface Props {
  sheet: PayrollSheet;
  diagnostics: Diagnostic[];
  onChange: (sheet: PayrollSheet) => void;
}

export function SheetEditor({ sheet, diagnostics, onChange }: Props) {
  const updateRubric = (index: number, patch: Partial<Rubric>) =>
    onChange({
      ...sheet,
      rubrics: sheet.rubrics.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    });

  const addRubric = () => {
    let n = sheet.rubrics.length + 1;
    while (sheet.rubrics.some((r) => r.code === `NOVA_${n}`)) n++;
    onChange({
      ...sheet,
      rubrics: [
        ...sheet.rubrics,
        { code: `NOVA_${n}`, description: 'Nova rubrica', kind: 'Earning', formula: '0' },
      ],
    });
  };

  const sheetLevel = diagnostics.filter((d) => d.rubric === null);

  return (
    <section className="panel" aria-labelledby="inputs-title">
      <h2 id="inputs-title">Entradas</h2>
      <div className="inputs">
        {Object.entries(sheet.inputs).map(([name, value]) => (
          <label key={name}>
            <span className="mono">{name}</span>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) =>
                onChange({
                  ...sheet,
                  inputs: { ...sheet.inputs, [name]: e.target.valueAsNumber || 0 },
                })
              }
            />
          </label>
        ))}
      </div>

      <h2>Rubricas</h2>
      <p className="hint">
        A ordem não importa: o motor monta o grafo de dependências e calcula na ordem certa.
      </p>
      <div className="rubrics">
        {sheet.rubrics.map((rubric, index) => (
          <div className="rubric-row" key={index}>
            <input
              aria-label="Código"
              className="mono code"
              value={rubric.code}
              onChange={(e) => updateRubric(index, { code: e.target.value.toUpperCase() })}
            />
            <select
              aria-label={`Tipo de ${rubric.code}`}
              value={rubric.kind}
              onChange={(e) => updateRubric(index, { kind: e.target.value as RubricKind })}
            >
              {Object.entries(kinds).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ghost"
              aria-label={`Remover ${rubric.code}`}
              onClick={() => onChange({ ...sheet, rubrics: sheet.rubrics.filter((_, i) => i !== index) })}
            >
              ×
            </button>
            <FormulaField
              code={rubric.code}
              value={rubric.formula}
              diagnostics={diagnostics.filter((d) => d.rubric?.toUpperCase() === rubric.code.toUpperCase())}
              onChange={(formula) => updateRubric(index, { formula })}
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={addRubric}>
        + Rubrica
      </button>

      {sheetLevel.length > 0 && (
        <ul className="sheet-errors" role="alert">
          {sheetLevel.map((d, i) => (
            <li key={i}>
              {d.code}: {d.message}
            </li>
          ))}
        </ul>
      )}

      <details className="tables">
        <summary>Tabelas ({sheet.tables.length})</summary>
        {sheet.tables.map((table) => (
          <table key={table.code}>
            <caption>
              <span className="mono">{table.code}</span> · {table.description}
            </caption>
            <thead>
              <tr>
                <th scope="col">Até</th>
                <th scope="col">Alíquota</th>
                <th scope="col">Dedução</th>
              </tr>
            </thead>
            <tbody>
              {table.brackets.map((b, i) => (
                <tr key={i}>
                  <td>{b.upTo === null ? '∞' : b.upTo.toFixed(2)}</td>
                  <td>{(b.rate * 100).toFixed(1)}%</td>
                  <td>{b.deduction.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </details>
    </section>
  );
}
