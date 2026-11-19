const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const plain = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export const formatMoney = (value: number) => money.format(value);

export const formatNumber = (value: number) => plain.format(value);

export const formatPercent = (ratio: number) => percent.format(ratio);

/** Compact axis label: R$ 12 mil, R$ 1,5 mil, R$ 800. */
export function formatAxisMoney(value: number): string {
  if (Math.abs(value) < 1000) return `R$ ${Math.round(value)}`;
  const thousands = value / 1000;
  return `R$ ${plain.format(Math.round(thousands * 10) / 10)} mil`;
}
