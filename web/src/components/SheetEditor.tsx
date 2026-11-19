import { useState } from 'react';
import { kindOptions, kinds } from '../kinds';
import type { Diagnostic, FunctionInfo, PayrollSheet, Rubric, RubricKind, TaxTable } from '../types';
import { FormulaField } from './FormulaField';
import { TablesEditor } from './TablesEditor';

interface Props {
  sheet: PayrollSheet;
  diagnostics: Diagnostic[];
  functions: FunctionInfo[];
  onChange: (sheet: PayrollSheet) => void;
  onSaveRubric: (rubric: Rubric) => void;
  onSaveTable: (table: TaxTable) => void;
}

const IDENTIFIER = /^[A-Za-z_À-ÿ][A-Za-z0-9_À-ÿ]*$/;

export function SheetEditor({ sheet, diagnostics, functions, onChange, onSaveRubric, onSaveTable }: Props) {
  const [newInput, setNewInput] = useState('');

  const updateRubric = (index: number, patch: Partial<Rubric>) => {
    onChange({ ...sheet, rubrics: sheet.rubrics.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  };

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

  const inputName = newInput.trim().toUpperCase();
  const inputValid = IDENTIFIER.test(inputName) && !(inputName in sheet.inputs);
  const addInput = () => {
    if (!inputValid) return;
    onChange({ ...sheet, inputs: { ...sheet.inputs, [inputName]: 0 } });
    setNewInput('');
  };

  const removeInput = (name: string) => {
    onChange({
      ...sheet,
      inputs: Object.fromEntries(Object.entries(sheet.inputs).filter(([key]) => key !== name)),
    });
  };

  const sheetLevel = diagnostics.filter((d) => d.rubric === null);

  return (
    <section className="panel" aria-labelledby="sheet-title">
      <h2 id="sheet-title">
        <span className="step">1</span> Monte a folha
      </h2>

      <h3>Entradas</h3>
      <p className="hint">
        São os dados do colaborador. Use os nomes nas fórmulas, por exemplo <code>SALARIO_BASE * 30%</code>.
      </p>
      <div className="inputs">
        {Object.entries(sheet.inputs).map(([name, value]) => (
          <div className="input-card" key={name}>
            <label>
              <span className="mono">{name}</span>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => {
                  onChange({ ...sheet, inputs: { ...sheet.inputs, [name]: e.target.valueAsNumber || 0 } });
                }}
              />
            </label>
            <button
              type="button"
              className="icon"
              aria-label={`Remover entrada ${name}`}
              title="Remover entrada"
              onClick={() => removeInput(name)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          addInput();
        }}
      >
        <input
          aria-label="Nome da nova entrada"
          placeholder="NOVA_ENTRADA"
          className="mono"
          value={newInput}
          onChange={(e) => setNewInput(e.target.value)}
        />
        <button type="submit" className="secondary" disabled={!inputValid}>
          + Entrada
        </button>
      </form>

      <h3>Rubricas</h3>
      <p className="hint">
        Cada rubrica é uma fórmula. A ordem não importa: o motor descobre quem depende de quem e calcula na
        sequência certa.
      </p>
      <div className="rubrics">
        {sheet.rubrics.map((rubric, index) => (
          <article className={`rubric-card kind-${rubric.kind}`} key={index}>
            <div className="rubric-head">
              <input
                aria-label={`Código da rubrica ${index + 1}`}
                className="mono code"
                value={rubric.code}
                onChange={(e) => updateRubric(index, { code: e.target.value.toUpperCase() })}
              />
              <select
                aria-label={`Tipo de ${rubric.code}`}
                title={kinds[rubric.kind].hint}
                value={rubric.kind}
                onChange={(e) => updateRubric(index, { kind: e.target.value as RubricKind })}
              >
                {kindOptions.map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <input
              aria-label={`Descrição de ${rubric.code}`}
              className="description"
              value={rubric.description}
              onChange={(e) => updateRubric(index, { description: e.target.value })}
            />
            <FormulaField
              code={rubric.code}
              value={rubric.formula}
              diagnostics={diagnostics.filter((d) => d.rubric?.toUpperCase() === rubric.code.toUpperCase())}
              onChange={(formula) => updateRubric(index, { formula })}
            />
            <div className="card-actions">
              <button
                type="button"
                className="secondary"
                aria-label={`Salvar ${rubric.code} na biblioteca`}
                onClick={() => onSaveRubric(rubric)}
              >
                Salvar na biblioteca
              </button>
              <button
                type="button"
                className="ghost danger"
                aria-label={`Remover ${rubric.code}`}
                onClick={() => {
                  onChange({ ...sheet, rubrics: sheet.rubrics.filter((_, i) => i !== index) });
                }}
              >
                Remover da folha
              </button>
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="primary" onClick={addRubric}>
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

      {functions.length > 0 && (
        <details className="help">
          <summary>Funções que você pode usar nas fórmulas</summary>
          <dl>
            {functions.map((f) => (
              <div key={f.name}>
                <dt className="mono">{f.signature}</dt>
                <dd>{f.description}</dd>
              </div>
            ))}
            <div>
              <dt className="mono">+ − * / % ( )</dt>
              <dd>
                Aritmética. <code>30%</code> vale 0,30.
              </dd>
            </div>
            <div>
              <dt className="mono">{'> >= < <= == != && || !'}</dt>
              <dd>Comparações e lógica. Verdadeiro vale 1 e falso vale 0.</dd>
            </div>
          </dl>
        </details>
      )}

      <TablesEditor
        tables={sheet.tables}
        onChange={(tables) => onChange({ ...sheet, tables })}
        onSave={onSaveTable}
      />
    </section>
  );
}
