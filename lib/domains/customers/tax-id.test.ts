import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTaxId, isValidTaxId, normalizeTaxId, parseTaxId, sameTaxId } from './tax-id';

test('CPF válido com e sem pontuação', () => {
  assert.deepEqual(parseTaxId('529.982.247-25'), { ok: true, kind: 'CPF', value: '52998224725' });
  assert.equal(isValidTaxId('52998224725'), true);
});

test('CPF inválido: dígito errado, repetido, com letra', () => {
  assert.equal(isValidTaxId('529.982.247-24'), false);
  assert.equal(isValidTaxId('111.111.111-11'), false);
  assert.equal(isValidTaxId('5299822472A'), false);
});

test('CNPJ numérico continua válido', () => {
  assert.deepEqual(parseTaxId('11.222.333/0001-81'), { ok: true, kind: 'CNPJ', value: '11222333000181' });
  assert.equal(isValidTaxId('11.222.333/0001-80'), false);
  assert.equal(isValidTaxId('00000000000000'), false);
});

test('CNPJ alfanumérico (exemplo da Receita)', () => {
  assert.deepEqual(parseTaxId('12.ABC.345/01DE-35'), { ok: true, kind: 'CNPJ', value: '12ABC34501DE35' });
  assert.equal(isValidTaxId('12abc34501de35'), true, 'minúsculas são normalizadas');
  assert.equal(isValidTaxId('12.ABC.345/01DE-36'), false);
  assert.equal(isValidTaxId('12ABC34501DE3A'), false, 'DV é sempre numérico');
});

test('normalização preserva letras e remove só pontuação', () => {
  assert.equal(normalizeTaxId(' 12.abc.345/01de-35 '), '12ABC34501DE35');
});

test('formatação e comparação', () => {
  assert.equal(formatTaxId('52998224725'), '529.982.247-25');
  assert.equal(formatTaxId('12abc34501de35'), '12.ABC.345/01DE-35');
  assert.equal(formatTaxId('abc'), 'abc');
  assert.equal(sameTaxId('11.222.333/0001-81', '11222333000181'), true);
  assert.equal(sameTaxId(null, '11222333000181'), false);
});

test('rótulo digitado junto ao número é ignorado', () => {
  assert.equal(normalizeTaxId('CPF: 529.982.247-25'), '52998224725');
  assert.equal(normalizeTaxId('cnpj 11.222.333/0001-81'), '11222333000181');
  assert.equal(normalizeTaxId('CNPJ/CPF: 12.ABC.345/01DE-35'), '12ABC34501DE35');
  assert.equal(isValidTaxId('CPF: 529.982.247-25'), true);
});
