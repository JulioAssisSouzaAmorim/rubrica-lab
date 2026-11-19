import { formatNumber } from '../format';
import type { TraceNode } from '../types';

interface Props {
  node: TraceNode;
  onNavigate: (code: string) => void;
}

export function TraceTree({ node, onNavigate }: Props) {
  return (
    <ul className="trace" aria-label="Memória de cálculo">
      <TraceItem node={node} onNavigate={onNavigate} />
    </ul>
  );
}

function TraceItem({ node, onNavigate }: Props) {
  const { ref } = node;
  const line = (
    <>
      {ref ? (
        <button type="button" className="trace-ref" onClick={() => onNavigate(ref)}>
          {node.label}
        </button>
      ) : (
        <code>{node.label}</code>
      )}
      <span className="trace-value">= {formatNumber(node.value)}</span>
      {node.note && <span className="trace-note">{node.note}</span>}
    </>
  );

  if (node.children.length === 0) {
    return (
      <li>
        <span className="trace-line">{line}</span>
      </li>
    );
  }

  return (
    <li>
      <details open>
        <summary className="trace-line">{line}</summary>
        <ul>
          {node.children.map((child, i) => (
            <TraceItem key={`${i}-${child.label}`} node={child} onNavigate={onNavigate} />
          ))}
        </ul>
      </details>
    </li>
  );
}
