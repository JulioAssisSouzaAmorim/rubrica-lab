import type { RubricKind } from './types';

export const kinds: Record<RubricKind, { label: string; hint: string }> = {
  Earning: { label: 'Provento', hint: 'Soma no bruto' },
  Deduction: { label: 'Desconto', hint: 'Sai do líquido' },
  Base: { label: 'Base', hint: 'Valor intermediário, não entra nos totais' },
  Info: { label: 'Informativa', hint: 'Só informa, não entra nos totais' },
};

export const kindOptions = Object.entries(kinds) as [RubricKind, { label: string; hint: string }][];
