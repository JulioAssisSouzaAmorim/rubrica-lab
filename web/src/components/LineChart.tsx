import { useState, type PointerEvent } from 'react';
import { linePath, nearestIndex, niceTicks, scaleLinear } from '../chart';

export interface Series {
  id: string;
  label: string;
  color: string;
  values: (number | null)[];
}

interface Props {
  title: string;
  xs: number[];
  series: Series[];
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  formatTooltip?: (value: number) => string;
  yMin?: number;
  marker?: number | undefined;
}

const W = 640;
const H = 220;
const M = { top: 12, right: 72, bottom: 28, left: 64 };

export function LineChart({
  title,
  xs,
  series,
  formatX,
  formatY,
  formatTooltip = formatY,
  yMin,
  marker,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  if (xs.length < 2) return null;

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const lo = yMin ?? Math.min(...all);
  const yTicks = niceTicks(lo, Math.max(...all), 5);
  const yDomain: [number, number] = [Math.min(lo, yTicks[0] ?? lo), Math.max(...all, yTicks.at(-1) ?? 0)];
  const xDomain: [number, number] = [xs[0] ?? 0, xs.at(-1) ?? 1];
  const x = scaleLinear(xDomain, [M.left, W - M.right]);
  const y = scaleLinear(yDomain, [H - M.bottom, M.top]);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = box.width ? (e.clientX - box.left) / box.width : 0;
    setHover(nearestIndex(xs, xDomain[0] + ratio * (xDomain[1] - xDomain[0])));
  };

  const hx = hover === null ? null : x(xs[hover] ?? 0);

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {series.length > 1 && (
        <ul className="legend">
          {series.map((s) => (
            <li key={s.id}>
              <span className="swatch" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div className="chart-body">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
          {yTicks.map((t) => (
            <g key={t}>
              <line className="grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
              <text className="tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {formatY(t)}
              </text>
            </g>
          ))}
          {niceTicks(xDomain[0], xDomain[1], 6).map((t) => (
            <text key={t} className="tick" x={x(t)} y={H - 8} textAnchor="middle">
              {formatX(t)}
            </text>
          ))}
          {marker !== undefined && marker >= xDomain[0] && marker <= xDomain[1] && (
            <line className="marker" x1={x(marker)} x2={x(marker)} y1={M.top} y2={H - M.bottom} />
          )}
          {series.map((s) => {
            const points = s.values.flatMap((v, i) => (v === null ? [] : [[x(xs[i] ?? 0), y(v)] as const]));
            const last = points.at(-1);
            return (
              <g key={s.id}>
                <path className="series" d={linePath(points)} stroke={s.color} />
                {last && series.length > 1 && (
                  <text className="direct-label" x={last[0] + 6} y={last[1]} dy="0.32em">
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}
          {hx !== null && hover !== null && (
            <g>
              <line className="crosshair" x1={hx} x2={hx} y1={M.top} y2={H - M.bottom} />
              {series.map((s) => {
                const v = s.values[hover];
                return v === null || v === undefined ? null : (
                  <circle key={s.id} className="dot" cx={hx} cy={y(v)} r={4} fill={s.color} />
                );
              })}
            </g>
          )}
          <rect
            className="hit"
            x={M.left}
            y={M.top}
            width={W - M.left - M.right}
            height={H - M.top - M.bottom}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && hx !== null && (
          <div
            className="tooltip"
            role="status"
            style={{
              left: `${(hx / W) * 100}%`,
              transform: hx > W / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
            }}
          >
            <strong>{formatX(xs[hover] ?? 0)}</strong>
            {series.map((s) => {
              const v = s.values[hover];
              return (
                <span key={s.id}>
                  <span className="swatch" style={{ background: s.color }} />
                  {s.label}: {v === null || v === undefined ? '—' : formatTooltip(v)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
