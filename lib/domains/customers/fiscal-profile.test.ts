// Integração com Postgres DESCARTÁVEL (apaga clientes) e catálogo IBGE carregado.
//   TEST_DATABASE_URL=postgresql://... npm test
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'defina TEST_DATABASE_URL para rodar';

let prisma: typeof import('@/lib/db').prisma;
let fp: typeof import('./fiscal-profile');

before(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  prisma = (await import('@/lib/db')).prisma;
  fp = await import('./fiscal-profile');
});
after(async () => { await prisma?.$disconnect(); });
beforeEach(async () => { if (url) await prisma.customer.deleteMany({ where: { code: { startsWith: 'FP-' } } }); });

const base = {
  tradeName: '', ieIndicator: 'CONTRIBUINTE' as const, stateRegistration: '10.123.456-7',
  postalCode: '74000-000', street: 'Av. Anhanguera', number: 'sn', complement: '', district: 'Centro',
  cityName: 'goiania', state: 'go', municipalityCode: '',
};

async function load(id: string) {
  return prisma.customer.findUniqueOrThrow({ where: { id }, include: fp.principalAddressInclude });
}

test('resolve município pelo nome sem acento e grava endereço + espelho legado', { skip }, async () => {
  const c = await prisma.customer.create({ data: { code: 'FP-1', name: 'Cliente Fiscal', doc: '11222333000181', email: 'x@y.com' } });
  const r = await fp.resolveFiscalProfile(base);
  assert.ok(!('field' in r));
  await fp.saveFiscalProfile(prisma, c.id, r);
  const saved = await load(c.id);
  const a = saved.addresses[0];
  assert.equal(a.municipalityCode, '5208707');
  assert.equal(a.cityName, 'Goiânia');
  assert.equal(a.state, 'GO');
  assert.equal(a.number, 'S/N');
  assert.equal(saved.stateRegistration, '101234567');
  assert.equal(saved.address, 'Av. Anhanguera, S/N - Centro');
  assert.equal(saved.city, 'Goiânia');
  assert.equal(saved.zip, '74000000');
  assert.equal(fp.customerFiscalReadiness(saved).ready, true);
});

test('código IBGE de outra UF é descartado; cidade inexistente vira pendência', { skip }, async () => {
  const c = await prisma.customer.create({ data: { code: 'FP-2', name: 'Cliente Dois', doc: '52998224725' } });
  const r = await fp.resolveFiscalProfile({ ...base, municipalityCode: '3550308', cityName: 'Cidade Que Não Existe' });
  assert.ok(!('field' in r));
  assert.equal(r.address.municipalityCode, null);
  await fp.saveFiscalProfile(prisma, c.id, r);
  const fields = fp.customerFiscalReadiness(await load(c.id)).issues.map((i) => i.field);
  assert.deepEqual(fields, ['city']);
});

test('formato inválido de CEP/UF é recusado', { skip }, async () => {
  assert.deepEqual(await fp.resolveFiscalProfile({ ...base, postalCode: '123' }), { field: 'postalCode', message: 'CEP deve ter 8 dígitos.' });
  assert.deepEqual(await fp.resolveFiscalProfile({ ...base, state: 'XX' }), { field: 'state', message: 'UF inválida.' });
});

test('limpar todos os campos de endereço remove o endereço principal', { skip }, async () => {
  const c = await prisma.customer.create({ data: { code: 'FP-3', name: 'Cliente Três' } });
  await fp.saveFiscalProfile(prisma, c.id, (await fp.resolveFiscalProfile(base)) as never);
  const empty = { ...base, postalCode: '', street: '', number: '', district: '', cityName: '', state: '' };
  await fp.saveFiscalProfile(prisma, c.id, (await fp.resolveFiscalProfile(empty)) as never);
  const saved = await load(c.id);
  assert.equal(saved.addresses.length, 0);
  assert.equal(saved.address, null);
});

test('valores iniciais caem para os campos antigos quando não há endereço estruturado', { skip }, async () => {
  const c = await prisma.customer.create({ data: { code: 'FP-4', name: 'Legado', address: 'Rua 1, 10', city: 'Anápolis', state: 'GO', zip: '75000000' } });
  const d = fp.fiscalFormDefaults(await load(c.id));
  assert.equal(d.street, 'Rua 1, 10');
  assert.equal(d.cityName, 'Anápolis');
  assert.equal(d.postalCode, '75000000');
});
