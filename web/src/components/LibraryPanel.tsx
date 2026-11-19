import { kinds } from '../kinds';
import type { Library, Rubric, TaxTable } from '../types';

interface Props {
  library: Library | null;
  onUseRubric: (rubric: Rubric) => void;
  onDeleteRubric: (code: string) => void;
  onUseTable: (table: TaxTable) => void;
  onDeleteTable: (code: string) => void;
}

export function LibraryPanel({ library, onUseRubric, onDeleteRubric, onUseTable, onDeleteTable }: Props) {
  return (
    <section className="panel wide" aria-labelledby="library-title">
      <h2 id="library-title">
        <span className="step">3</span> Biblioteca
      </h2>
      <p className="hint">
        Guarde rubricas e tabelas para reaproveitar depois. Use &quot;Salvar na biblioteca&quot; nos cartões
        da folha; aqui você traz de volta para a folha ou exclui. Itens <span className="badge">Padrão</span>{' '}
        vêm com o exemplo e não podem ser excluídos.
      </p>

      {!library ? (
        <p className="hint">Carregando biblioteca…</p>
      ) : (
        <div className="library">
          <div>
            <h3>Rubricas ({library.rubrics.length})</h3>
            <ul className="library-list" aria-label="Rubricas salvas">
              {library.rubrics.map(({ rubric, builtIn }) => (
                <li key={rubric.code}>
                  <div className="library-info">
                    <strong className="mono">{rubric.code}</strong>
                    <span className={`chip kind-${rubric.kind}`}>{kinds[rubric.kind].label}</span>
                    {builtIn && <span className="badge">Padrão</span>}
                    <span className="library-desc">{rubric.description}</span>
                    <code className="library-formula">{rubric.formula}</code>
                  </div>
                  <div className="library-actions">
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`Usar rubrica ${rubric.code}`}
                      onClick={() => onUseRubric(rubric)}
                    >
                      Usar
                    </button>
                    {!builtIn && (
                      <button
                        type="button"
                        className="ghost danger"
                        aria-label={`Excluir rubrica ${rubric.code}`}
                        onClick={() => onDeleteRubric(rubric.code)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Tabelas ({library.tables.length})</h3>
            <ul className="library-list" aria-label="Tabelas salvas">
              {library.tables.map(({ table, builtIn }) => (
                <li key={table.code}>
                  <div className="library-info">
                    <strong className="mono">{table.code}</strong>
                    {builtIn && <span className="badge">Padrão</span>}
                    <span className="library-desc">
                      {table.description} · {table.brackets.length} faixa(s)
                    </span>
                  </div>
                  <div className="library-actions">
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`Usar tabela ${table.code}`}
                      onClick={() => onUseTable(table)}
                    >
                      Usar
                    </button>
                    {!builtIn && (
                      <button
                        type="button"
                        className="ghost danger"
                        aria-label={`Excluir tabela ${table.code}`}
                        onClick={() => onDeleteTable(table.code)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
