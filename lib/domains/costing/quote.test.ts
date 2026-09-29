import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuoteSummary, calculateQuote } from './quote';
import type { MaterialInput } from './rollup';

const material: MaterialInput = { id: 'barra', name: 'Barra 3 1/2"', kind: 'BARRA_REDONDA', unit: 'KG', unitCostCents: 950, diameterMm: 88.9 };
const input = { material, lengthMm: 250, quantity: 1, scrapPercent: 5, processes: [], serviceCents: 0, pricing: { taxBps: 450, commissionBps: 0, paymentFeeBps: 100, fixedExpenseBps: 1000, marginBps: 1500 } };

test('cotação de barra 3 1/2 × 250 mm com 5% de perda ≈ 12,79 kg', () => {
  const r = calculateQuote(input)!;
  assert.ok(Math.abs(r.kg - 12.79) < 0.01);
  assert.equal(r.steelCents, Math.round(r.kg * 950));
  assert.ok(r.suggestion.ok);
});

test('processos e serviço são do lote; aço aceita cadastro por metro', () => {
  const r = calculateQuote({ ...input, material: { ...material, unit: 'M', unitCostCents: 10000 }, quantity: 2, serviceCents: 950, processes: [{ workCenter: { id: 'torno', name: 'Torno', rateCentsPerHour: 6000 }, minutes: 30 }] })!;
  assert.equal(r.steelCents, 5250);
  assert.equal(r.processCents, 3000);
  assert.equal(r.totalCents, 9200);
});

test('cotação não sugere preço para campos inválidos ou material sem custo', () => {
  for (const patch of [{ lengthMm: NaN }, { quantity: 1.5 }, { quantity: 0 }, { scrapPercent: -1 }, { serviceCents: -1 }, { material: { ...material, unitCostCents: 0 } }]) assert.equal(calculateQuote({ ...input, ...patch }), null);
});

test('resumo para WhatsApp contém material, medidas, quantidade, perda, peso e preço do lote', () => {
  const summary = buildQuoteSummary({ materialName: material.name, diameterMm: 88.9, lengthMm: 250, quantity: 1, scrapPercent: 5, kg: 12.79, priceCents: 18000 });
  assert.equal(summary.replace(/\u00a0/g, ' '), 'Cotação — Barra 3 1/2"\nMedidas: Ø 88,9 mm × 250 mm\nQuantidade: 1 peça(s) · perda: 5%\nPeso total com perda: 12,79 kg\nPreço sugerido do lote: R$ 180,00');
  assert.match(buildQuoteSummary({ materialName: 'Tubo', diameterMm: 60.3, wallMm: 3.91, lengthMm: 1000, quantity: 2, scrapPercent: 0, kg: 10.88, priceCents: 20000 }), /parede 3,91 mm/);
});
