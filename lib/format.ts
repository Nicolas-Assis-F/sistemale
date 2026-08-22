export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function parseCurrencyToCents(value: string): number {
  if (!value || value.trim() === '') return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

export function centsToCurrencyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
