import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fiscalReadiness, normalizePostalCode, normalizeStateRegistration, type FiscalAddressInput } from './fiscal-readiness';

const address: FiscalAddressInput = {
  postalCode: '74000-000', street: 'Av. Anhanguera', number: 'S/N', district: 'Centro',
  municipalityCode: '5208707', state: 'GO', municipalityState: 'GO',
};
const pj = { name: 'L&E Cliente Ltda', doc: '11.222.333/0001-81', email: 'a@b.com', ieIndicator: 'CONTRIBUINTE' as const, stateRegistration: '10.123.456-7' };
const fields = (r: ReturnType<typeof fiscalReadiness>) => r.issues.map((i) => i.field);

test('PJ contribuinte completo está pronto', () => {
  const r = fiscalReadiness(pj, address);
  assert.equal(r.ready, true);
  assert.equal(r.personKind, 'CNPJ');
  assert.deepEqual(r.warnings, []);
});

test('cadastro vazio lista todas as pendências, sem inventar dados', () => {
  const r = fiscalReadiness({ name: '', doc: null, ieIndicator: null, stateRegistration: null }, null);
  assert.equal(r.ready, false);
  assert.deepEqual(fields(r), ['name', 'doc', 'ieIndicator', 'postalCode']);
  assert.deepEqual(r.warnings.map((w) => w.field), ['email']);
});

test('enquadramento nunca é deduzido do documento', () => {
  const r = fiscalReadiness({ ...pj, doc: '529.982.247-25', ieIndicator: null }, address);
  assert.deepEqual(fields(r), ['ieIndicator']);
  assert.equal(r.personKind, 'CPF');
});

test('produtor rural PF pode ser contribuinte com IE', () => {
  const r = fiscalReadiness({ ...pj, doc: '529.982.247-25', stateRegistration: '0012345678' }, address);
  assert.equal(r.ready, true);
});

test('regras de IE por enquadramento', () => {
  assert.deepEqual(fields(fiscalReadiness({ ...pj, stateRegistration: '' }, address)), ['stateRegistration']);
  assert.deepEqual(fields(fiscalReadiness({ ...pj, stateRegistration: 'Isento' }, address)), ['stateRegistration']);
  assert.deepEqual(fields(fiscalReadiness({ ...pj, ieIndicator: 'ISENTO', stateRegistration: '123' }, address)), ['stateRegistration']);
  assert.equal(fiscalReadiness({ ...pj, ieIndicator: 'ISENTO', stateRegistration: null }, address).ready, true);
  assert.equal(fiscalReadiness({ ...pj, ieIndicator: 'NAO_CONTRIBUINTE', stateRegistration: null }, address).ready, true);
});

test('endereço incompleto ou incoerente', () => {
  const r = fiscalReadiness(pj, { ...address, postalCode: '7400', number: ' ', municipalityCode: null });
  assert.deepEqual(fields(r), ['postalCode', 'number', 'city']);
  const uf = fiscalReadiness(pj, { ...address, state: 'SP' });
  assert.deepEqual(fields(uf), ['city']);
});

test('normalizações preservam zeros e letras', () => {
  assert.equal(normalizePostalCode('74.000-000'), '74000000');
  assert.equal(normalizeStateRegistration('p-01100424.3/002'), 'P011004243002');
  assert.equal(normalizeStateRegistration('00.123.456-7'), '001234567');
});
