import { formatCurrency } from '../../format';
import { suggestPrice, type PriceInputs } from './pricing';
import { kgPerMeter, pieceKg } from './steel';
import type { MaterialInput, WorkCenterInput } from './rollup';

export function calculateQuote(input: {
  material: MaterialInput; lengthMm: number; quantity: number; scrapPercent: number;
  processes: { workCenter: WorkCenterInput; minutes: number }[];
  serviceCents: number; pricing: PriceInputs;
}) {
  const { material: m, lengthMm, quantity, scrapPercent, processes, serviceCents, pricing } = input;
  if ((m.kind !== 'BARRA_REDONDA' && m.kind !== 'TUBO') || (m.unit !== 'KG' && m.unit !== 'M') ||
      ![lengthMm, quantity, scrapPercent, serviceCents].every(Number.isFinite) ||
      lengthMm <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0 || scrapPercent < 0 ||
      !Number.isSafeInteger(serviceCents) || serviceCents < 0 || m.unitCostCents <= 0 ||
      processes.some((p) => !Number.isFinite(p.minutes) || p.minutes <= 0 || p.workCenter.rateCentsPerHour <= 0)) return null;
  const perMeter = kgPerMeter(m.kind, m.diameterMm ?? 0, m.wallMm);
  const kg = pieceKg(m.kind, m.diameterMm ?? 0, m.wallMm, lengthMm, scrapPercent) * quantity;
  if (!(perMeter > 0) || !(kg > 0) || !Number.isFinite(kg)) return null;
  const steelCents = Math.round((m.unit === 'KG' ? kg : kg / perMeter) * m.unitCostCents);
  const processCents = processes.reduce((sum, p) => sum + Math.round(p.minutes / 60 * p.workCenter.rateCentsPerHour), 0);
  const totalCents = steelCents + processCents + serviceCents;
  if (!Number.isSafeInteger(totalCents)) return null;
  const suggestion = suggestPrice(totalCents, pricing);
  if (suggestion.ok && !Number.isSafeInteger(suggestion.priceCents)) return null;
  return { kg, steelCents, processCents, totalCents, suggestion };
}

export function buildQuoteSummary(input: {
  materialName: string; diameterMm: number; wallMm?: number | null; lengthMm: number;
  quantity: number; scrapPercent: number; kg: number; priceCents: number;
}) {
  const n = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return [
    `Cotação — ${input.materialName}`,
    `Medidas: Ø ${n(input.diameterMm)} mm${input.wallMm ? ` · parede ${n(input.wallMm)} mm` : ''} × ${n(input.lengthMm)} mm`,
    `Quantidade: ${input.quantity} peça(s) · perda: ${n(input.scrapPercent)}%`,
    `Peso total com perda: ${n(input.kg)} kg`,
    `Preço sugerido do lote: ${formatCurrency(input.priceCents)}`,
  ].join('\n');
}
