import { describe, expect, it } from 'vitest';
import { linePath, nearestIndex, niceTicks, scaleLinear } from './chart';
import { formatAxisMoney, formatMoney, formatPercent } from './format';
import { splitAtSpan } from './highlight';

const normalize = (s: string) => s.replace(/\u00a0/g, ' ');

describe('format', () => {
  it('formats BRL currency', () => {
    expect(normalize(formatMoney(6814.89))).toBe('R$ 6.814,89');
  });

  it('formats ratios as percent', () => {
    expect(normalize(formatPercent(0.9425))).toBe('94,3%');
  });

  it.each([
    [800, 'R$ 800'],
    [1500, 'R$ 1,5 mil'],
    [12000, 'R$ 12 mil'],
  ])('compacts axis value %d', (value, expected) => {
    expect(formatAxisMoney(value)).toBe(expected);
  });
});

describe('splitAtSpan', () => {
  it('returns the whole source when there is no span', () => {
    expect(splitAtSpan('A + B', null)).toEqual({ before: 'A + B', marked: '', after: '' });
  });

  it('isolates the offending token', () => {
    expect(splitAtSpan('SALARO * 2', { start: 0, length: 6 })).toEqual({
      before: '',
      marked: 'SALARO',
      after: ' * 2',
    });
  });

  it('marks a blank at the end of input', () => {
    expect(splitAtSpan('1 +', { start: 3, length: 0 })).toEqual({ before: '1 +', marked: ' ', after: '' });
  });

  it('clamps spans that fall outside the source', () => {
    expect(splitAtSpan('AB', { start: 5, length: 3 })).toEqual({ before: 'AB', marked: ' ', after: '' });
  });
});

describe('chart helpers', () => {
  it('produces nice ticks', () => {
    expect(niceTicks(0, 10000, 5)).toEqual([0, 2500, 5000, 7500, 10000]);
    expect(niceTicks(0.7, 1, 4)).toEqual([0.7, 0.8, 0.9, 1]);
  });

  it('degrades to a single tick for empty ranges', () => {
    expect(niceTicks(5, 5)).toEqual([5]);
  });

  it('maps linearly and handles zero-width domains', () => {
    expect(scaleLinear([0, 10], [100, 200])(5)).toBe(150);
    expect(scaleLinear([3, 3], [100, 200])(3)).toBe(100);
  });

  it('finds the nearest x', () => {
    const xs = [0, 10, 20, 30];
    expect(nearestIndex(xs, 14)).toBe(1);
    expect(nearestIndex(xs, 16)).toBe(2);
    expect(nearestIndex(xs, -5)).toBe(0);
    expect(nearestIndex(xs, 99)).toBe(3);
  });

  it('builds an SVG path', () => {
    expect(
      linePath([
        [0, 0],
        [10, 5.25],
      ]),
    ).toBe('M0.0,0.0L10.0,5.3');
  });
});
