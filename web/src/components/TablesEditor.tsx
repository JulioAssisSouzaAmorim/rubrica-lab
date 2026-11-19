import type { Bracket, TaxTable } from '../types';

interface Props {
  tables: TaxTable[];
  onChange: (tables: TaxTable[]) => void;
  onSave: (table: TaxTable) => void;
}

const num = (input: HTMLInputElement) => (Number.isNaN(input.valueAsNumber) ? 0 : input.valueAsNumber);

export function TablesEditor({ tables, onChange, onSave }: Props) {
  const update = (index: number, patch: Partial<TaxTable>) => {
    onChange(tables.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const updateBracket = (table: number, row: number, patch: Partial<Bracket>) => {
    const current = tables[table];
    if (!current) return;
    update(table, { brackets: current.brackets.map((b, i) => (i === row ? { ...b, ...patch } : b)) });
  };

  const addTable = () => {
    let n = tables.length + 1;
    while (tables.some((t) => t.code === `TABELA_${n}`)) n++;
    onChange([
      ...tables,
      {
        code: `TABELA_${n}`,
        description: 'Nova tabela',
        brackets: [
          { upTo: 1000, rate: 0, deduction: 0 },
          { upTo: null, rate: 0.1, deduction: 0 },
        ],
      },
    ]);
  };

  return (
    <div className="tables">
      <h3>Tabelas</h3>
      <p className="hint">
        Faixas usadas por <code>progressiva(base, TABELA)</code> e <code>faixa(base, TABELA)</code>. Deixe
        &quot;Até&quot; vazio na última faixa para ela não ter limite.
      </p>
      {tables.map((table, t) => (
        <article className="table-card" key={t}>
          <div className="rubric-head">
            <input
              aria-label={`Código da tabela ${t + 1}`}
              className="mono code"
              value={table.code}
              onChange={(e) => update(t, { code: e.target.value.toUpperCase() })}
            />
            <input
              aria-label={`Descrição da tabela ${table.code}`}
              className="description"
              value={table.description}
              onChange={(e) => update(t, { description: e.target.value })}
            />
          </div>
          <table>
            <caption className="sr-only">Faixas de {table.code}</caption>
            <thead>
              <tr>
                <th scope="col">Até (R$)</th>
                <th scope="col">Alíquota (%)</th>
                <th scope="col">Dedução (R$)</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {table.brackets.map((b, row) => (
                <tr key={row}>
                  <td>
                    <input
                      aria-label={`${table.code} faixa ${row + 1}: até`}
                      type="number"
                      step="any"
                      placeholder="sem limite"
                      value={b.upTo ?? ''}
                      onChange={(e) =>
                        updateBracket(t, row, {
                          upTo: e.target.value === '' ? null : num(e.target),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${table.code} faixa ${row + 1}: alíquota`}
                      type="number"
                      step="any"
                      value={Number((b.rate * 100).toFixed(4))}
                      onChange={(e) => updateBracket(t, row, { rate: num(e.target) / 100 })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${table.code} faixa ${row + 1}: dedução`}
                      type="number"
                      step="any"
                      value={b.deduction}
                      onChange={(e) => updateBracket(t, row, { deduction: num(e.target) })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon"
                      aria-label={`Remover faixa ${row + 1} de ${table.code}`}
                      disabled={table.brackets.length === 1}
                      onClick={() => update(t, { brackets: table.brackets.filter((_, i) => i !== row) })}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-actions">
            <button
              type="button"
              className="ghost"
              onClick={() =>
                update(t, { brackets: [...table.brackets, { upTo: null, rate: 0, deduction: 0 }] })
              }
            >
              + Faixa
            </button>
            <button
              type="button"
              className="secondary"
              aria-label={`Salvar tabela ${table.code} na biblioteca`}
              onClick={() => onSave(table)}
            >
              Salvar na biblioteca
            </button>
            <button
              type="button"
              className="ghost danger"
              aria-label={`Remover tabela ${table.code}`}
              onClick={() => onChange(tables.filter((_, i) => i !== t))}
            >
              Remover da folha
            </button>
          </div>
        </article>
      ))}
      <button type="button" className="primary" onClick={addTable}>
        + Tabela
      </button>
    </div>
  );
}
