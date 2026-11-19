import { splitAtSpan } from '../highlight';
import type { Diagnostic } from '../types';

interface Props {
  code: string;
  value: string;
  diagnostics: Diagnostic[];
  onChange: (value: string) => void;
}

export function FormulaField({ code, value, diagnostics, onChange }: Props) {
  const errorId = `formula-error-${code}`;
  const first = diagnostics[0];
  const segments = first ? splitAtSpan(value, first.span) : null;

  return (
    <div className="formula">
      <input
        aria-label={`Fórmula de ${code}`}
        aria-invalid={diagnostics.length > 0}
        aria-describedby={first ? errorId : undefined}
        className="mono"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {first && segments && (
        <div id={errorId} className="formula-error" role="alert">
          {first.span && (
            <code className="formula-echo">
              {segments.before}
              <mark>{segments.marked}</mark>
              {segments.after}
            </code>
          )}
          <span>
            {first.code}: {first.message}
            {diagnostics.length > 1 && ` (+${diagnostics.length - 1})`}
          </span>
        </div>
      )}
    </div>
  );
}
