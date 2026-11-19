import type { TextSpan } from './types';

export interface Segments {
  before: string;
  marked: string;
  after: string;
}

/** Splits a formula around a diagnostic span; an empty span (end of input) marks a single blank. */
export function splitAtSpan(source: string, span: TextSpan | null): Segments {
  if (!span) return { before: source, marked: '', after: '' };

  const start = Math.min(Math.max(span.start, 0), source.length);
  const end = Math.min(start + Math.max(span.length, 0), source.length);
  const marked = source.slice(start, end);
  return {
    before: source.slice(0, start),
    marked: marked === '' ? ' ' : marked,
    after: source.slice(end),
  };
}
