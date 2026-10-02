import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cutPieces, cutPlanWasteM, lengthWithinTolerance, markCode, nextRodSerials, parseCutPlan, pieceRatePay, rodSerialPrefix, rodSku, CUT_PLANS,
} from './rules';

test('planos de corte: peças válidas, sobra e peças geradas', () => {
  assert.deepEqual(parseCutPlan('4+3+2'), [4, 3, 2]);
  assert.equal(parseCutPlan('4+4+2'), null, 'passa de 9 m');
  assert.equal(parseCutPlan('5+4'), null, 'comprimento fora da linha');
  assert.equal(cutPlanWasteM('4+3+2'), 0);
  assert.equal(cutPlanWasteM('4+4'), 1);
  assert.deepEqual(cutPieces('3+2+2+2', 10), { 3: 10, 2: 30 });
  for (const plan of CUT_PLANS) assert.ok(parseCutPlan(plan), plan);
});

test('marca gravada usa o dia de Brasília e a letra do soldador', () => {
  // 02/10/2026 01:30 UTC ainda é 01/10 em Brasília (UTC−3)
  assert.equal(markCode(new Date('2026-10-02T01:30:00Z'), 's'), '011026S');
  assert.equal(markCode(new Date('2026-10-02T15:00:00Z'), ''), '021026X');
  assert.equal(rodSerialPrefix(new Date('2026-10-02T15:00:00Z')), 'H2610-');
});

test('números internos continuam do último do mês', () => {
  assert.deepEqual(nextRodSerials('H2610-', null, 2), ['H2610-0001', 'H2610-0002']);
  assert.deepEqual(nextRodSerials('H2610-', 'H2610-0041', 1), ['H2610-0042']);
});

test('tolerância de comprimento ±5 mm', () => {
  assert.ok(lengthWithinTolerance(3, 3005));
  assert.ok(lengthWithinTolerance(3, 2995));
  assert.ok(!lengthWithinTolerance(3, 3006));
});

test('pagamento por produção e SKU do catálogo', () => {
  assert.equal(pieceRatePay(30, 0, 2000), 60000);
  assert.equal(pieceRatePay(0, 28, 1500), 42000);
  assert.equal(rodSku('278', 3), 'LE-HASTE-278-3M');
});
