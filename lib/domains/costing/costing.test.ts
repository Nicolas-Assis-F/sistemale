import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_SIZES, parseDecimal, parseInches, pieceKg, roundBarKgPerMeter, TUBE_SIZES, tubeKgPerMeter } from './steel';
import { laborHourCents, marginAtPrice, simplesEffectiveBps, suggestPrice } from './pricing';
import { computeSheet, type Catalog } from './rollup';

const close = (a: number, b: number, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

test('pesos de tubo batem com a tabela ASME B36.10', () => {
  const expected: Record<string, [number, number]> = { '2 3/8"': [5.44, 7.48], '2 7/8"': [8.63, 11.41], '3 1/2"': [11.29, 15.27] };
  for (const s of TUBE_SIZES) {
    close(tubeKgPerMeter(s.odMm, s.walls[0].wallMm), expected[s.label][0]);
    close(tubeKgPerMeter(s.odMm, s.walls[1].wallMm), expected[s.label][1]);
  }
});

test('barra maciça: peso por metro e peça com perda', () => {
  close(roundBarKgPerMeter(BAR_SIZES[0].diameterMm), 22.44, 0.05); // 2 3/8"
  close(roundBarKgPerMeter(BAR_SIZES[2].diameterMm), 48.73, 0.05); // 3 1/2"
  // peça de 250 mm de barra 3 1/2" com 5% de perda
  close(pieceKg('BARRA_REDONDA', 88.9, null, 250, 5), 48.73 * 0.25 * 1.05, 0.05);
  assert.equal(tubeKgPerMeter(50, 30), 0, 'parede impossível');
});

test('polegadas', () => {
  close(parseInches('2 3/8'), 60.325, 0.001);
  close(parseInches('2 7/8"'), 73.025, 0.001);
  close(parseInches('3,5'), 88.9, 0.001);
  close(parseInches('60.3mm'), 60.3, 0.001);
});

test('Simples Anexo II: alíquota efetiva', () => {
  assert.equal(simplesEffectiveBps(0), 450);
  assert.equal(simplesEffectiveBps(150_000_00), 450);
  // 500 mil: (500k × 10% − 13.860) / 500k = 7,228%
  assert.equal(simplesEffectiveBps(500_000_00), 723);
  // 1,2 mi: (1,2mi × 11,2% − 22.500) / 1,2mi = 9,325%
  assert.equal(simplesEffectiveBps(1_200_000_00), 933);
  assert.equal(simplesEffectiveBps(5_000_000_00), null, 'acima do teto');
});

test('preço pelo mark-up divisor e margem real', () => {
  const p = { taxBps: 723, commissionBps: 300, paymentFeeBps: 100, fixedExpenseBps: 1500, marginBps: 1500 };
  const r = suggestPrice(100_00, p);
  assert.ok(r.ok);
  assert.equal(r.priceCents, 17015); // 100 ÷ (1 − 41,23%) = 170,1549
  const b = r.breakdown;
  assert.equal(b.costCents + b.taxCents + b.commissionCents + b.paymentFeeCents + b.fixedExpenseCents + b.profitCents, r.priceCents);
  const m = marginAtPrice(r.priceCents, 100_00, p);
  assert.ok(m !== null && Math.abs(m - 1500) <= 1, 'margem real = margem pedida');
  assert.equal(suggestPrice(100_00, { ...p, marginBps: 8000 }).ok, false, 'soma ≥ 100% (106,23%)');
  assert.equal(marginAtPrice(90_00, 100_00, p)! < 0, true, 'preço abaixo do custo dá margem negativa');
});

test('custo-hora de mão de obra', () => {
  // R$ 3.000 + 36% encargos ÷ (176 h × 80%) = R$ 28,98/h
  assert.equal(laborHourCents({ salaryCents: 3000_00 }), 2898);
  assert.equal(laborHourCents({ salaryCents: 3000_00, machineHourCents: 1500 }), 2898 + 1500);
});

function catalog(): Catalog {
  return {
    materials: new Map([
      ['barra312', { id: 'barra312', name: 'Barra 1045 3 1/2"', kind: 'BARRA_REDONDA', unit: 'KG', unitCostCents: 900, diameterMm: 88.9 }],
      ['tubo278', { id: 'tubo278', name: 'Tubo 2 7/8" SCH80', kind: 'TUBO', unit: 'KG', unitCostCents: 1200, diameterMm: 73, wallMm: 7.01 }],
      ['motor', { id: 'motor', name: 'Motor hidráulico', kind: 'COMPONENTE', unit: 'UN', unitCostCents: 1500_00 }],
      ['tempera', { id: 'tempera', name: 'Têmpera (terceiro)', kind: 'SERVICO', unit: 'UN', unitCostCents: 40_00 }],
    ]),
    workCenters: new Map([
      ['torno', { id: 'torno', name: 'Torno CNC', rateCentsPerHour: 120_00 }],
      ['serra', { id: 'serra', name: 'Serra', rateCentsPerHour: 60_00 }],
    ]),
    sheets: new Map([
      ['tooljoint', { id: 'tooljoint', name: 'Tool joint 3 1/2"', batchQty: 1, lines: [
        { kind: 'MATERIAL', materialId: 'barra312', lengthMm: 250, quantity: 1, scrapBps: 500 },
        { kind: 'PROCESSO', workCenterId: 'torno', minutes: 45, quantity: 1 },
        { kind: 'SERVICO', materialId: 'tempera', quantity: 1 },
      ] }],
      ['haste', { id: 'haste', name: 'Haste 3 m', batchQty: 1, lines: [
        { kind: 'MATERIAL', materialId: 'tubo278', lengthMm: 3000, quantity: 1, scrapBps: 200 },
        { kind: 'SUBFICHA', subSheetId: 'tooljoint', quantity: 2 },
        { kind: 'PROCESSO', workCenterId: 'serra', minutes: 10, quantity: 1 },
      ] }],
      ['maquina', { id: 'maquina', name: 'Perfuratriz', batchQty: 1, lines: [
        { kind: 'COMPONENTE', materialId: 'motor', quantity: 1 },
        { kind: 'SUBFICHA', subSheetId: 'haste', quantity: 4 },
      ] }],
      ['ciclo', { id: 'ciclo', name: 'Ciclo', batchQty: 1, lines: [{ kind: 'SUBFICHA', subSheetId: 'ciclo', quantity: 1 }] }],
    ]),
  };
}

test('ficha com barra por kg, usinagem e serviço (tool joint)', () => {
  const r = computeSheet('tooljoint', catalog());
  const kg = 48.73 * 0.25 * 1.05; // ≈ 12,79 kg
  close(r.kgPerUnit, kg, 0.05);
  const expected = Math.round(kg * 900) + 90_00 + 40_00; // aço + 45 min de torno a 120/h + têmpera
  assert.ok(Math.abs(r.unitCents - expected) <= 5, `${r.unitCents} ≈ ${expected}`);
  assert.equal(r.unitByCategory.maoDeObra, 90_00);
  assert.equal(r.unitByCategory.servicos, 40_00);
  assert.deepEqual(r.warnings, []);
});

test('subfichas em vários níveis somam custo e peso, com categorias corretas', () => {
  const c = catalog();
  const tj = computeSheet('tooljoint', c);
  const haste = computeSheet('haste', c);
  const tubeKg = 11.41 * 3 * 1.02;
  close(haste.kgPerUnit, tubeKg + 2 * tj.kgPerUnit, 0.1);
  const maq = computeSheet('maquina', c);
  assert.equal(maq.unitCents, 1500_00 + 4 * haste.unitCents);
  const sum = Object.values(maq.unitByCategory).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(sum - maq.unitCents) <= 4, 'categorias somam o total');
  assert.equal(maq.unitByCategory.componentes, 1500_00);
});

test('ciclo e dados faltando viram aviso, não travam', () => {
  const c = catalog();
  const r = computeSheet('ciclo', c);
  assert.equal(r.unitCents, 0);
  assert.match(r.warnings[0], /ciclo/);
  c.sheets.set('incompleta', { id: 'incompleta', name: 'X', batchQty: 2, lines: [{ kind: 'MATERIAL', materialId: 'barra312', quantity: 1 }, { kind: 'PROCESSO', quantity: 1 }] });
  assert.equal(computeSheet('incompleta', c).warnings.length, 2);
});

test('lote: custo unitário divide pelo tamanho do lote', () => {
  const c = catalog();
  c.sheets.set('lote', { id: 'lote', name: 'Lote de 10', batchQty: 10, lines: [{ kind: 'OUTRO', unitCostCents: 100_00, quantity: 1 }] });
  assert.equal(computeSheet('lote', c).unitCents, 10_00);
});

test('números digitados em pt-BR ou com ponto', () => {
  assert.equal(parseDecimal('9,50'), 9.5);
  assert.equal(parseDecimal('9.50'), 9.5);
  assert.equal(parseDecimal('60.3'), 60.3);
  assert.equal(parseDecimal('7.62'), 7.62);
  assert.equal(parseDecimal('1.234,56'), 1234.56);
  assert.equal(parseDecimal('1.234.567'), 1234567);
  assert.equal(parseDecimal('R$ 1.500', true), 1500);
  assert.equal(parseDecimal('1.500'), 1.5, 'sem dica de milhar, ponto é decimal');
  assert.equal(parseDecimal('abc'), null);
  assert.equal(parseDecimal(''), null);
});
