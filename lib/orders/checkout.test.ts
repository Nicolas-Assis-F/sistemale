// Checkout contra Postgres DESCARTÁVEL (apaga pedidos, clientes e produtos) com
// a API do Asaas SIMULADA (fetch). Nenhuma chamada real sai daqui.
//   TEST_DATABASE_URL=postgresql://... npm test
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'defina TEST_DATABASE_URL para rodar';

let prisma: typeof import('@/lib/db').prisma;
let co: typeof import('./checkout');
const realFetch = globalThis.fetch;

type Call = { method: string; path: string; body?: Record<string, unknown> };
let calls: Call[] = [];
let failNextPayment = false;
let seq = 0;

function fakeAsaas(input: string | URL | Request, init?: RequestInit) {
  const u = new URL(String(input));
  const method = init?.method ?? 'GET';
  const path = u.pathname.replace(/^\/v3/, '');
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ method, path, body });
  const json = (status: number, data: unknown) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  if (method === 'POST' && path === '/customers') return json(200, { id: 'cus_test' });
  if (method === 'POST' && path === '/payments') {
    if (failNextPayment) { failNextPayment = false; return json(400, { errors: [{ description: 'Serviço indisponível' }] }); }
    const id = `pay_test_${++seq}`;
    return json(200, { id, customer: 'cus_test', status: 'PENDING', billingType: body.billingType, value: body.value, dueDate: body.dueDate, invoiceUrl: `https://sandbox.asaas.com/i/${id}`, externalReference: body.externalReference });
  }
  if (method === 'GET' && path.endsWith('/pixQrCode')) return json(200, { payload: '00020126PIXCOPIAECOLA', encodedImage: 'iVBORw0KGgo=' });
  if (method === 'DELETE' && path.startsWith('/payments/')) return json(200, { deleted: true });
  return json(404, { errors: [{ description: `rota não simulada ${method} ${path}` }] });
}

before(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  process.env.ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3';
  process.env.ASAAS_API_KEY_SANDBOX = '$aact_hmlg_teste_simulado';
  process.env.RESEND_API_KEY = '';
  process.env.ADMIN_NOTIFY_EMAIL = '';
  process.env.NEXT_PUBLIC_COMPANY_EMAIL = '';
  globalThis.fetch = fakeAsaas as typeof fetch;
  prisma = (await import('@/lib/db')).prisma;
  co = await import('./checkout');
});
after(async () => { globalThis.fetch = realFetch; await prisma?.$disconnect(); });

let customer: Awaited<ReturnType<typeof prisma.customer.create>>;
beforeEach(async () => {
  if (!url) return;
  calls = []; failNextPayment = false;
  await prisma.$executeRawUnsafe('TRUNCATE "Job","WebhookInbox","Customer","Product","Category" CASCADE');
  const cat = await prisma.category.create({ data: { slug: 't', name: 'T' } });
  const mk = (slug: string, priceCents: number, stock: number) => prisma.product.create({ data: { slug, sku: slug.toUpperCase(), name: `Produto ${slug}`, shortDesc: 'x', description: 'x', specs: {}, priceCents, stock, categoryId: cat.id } });
  await mk('ponteira', 5000, 2);
  await mk('cotacao', 0, 0);
  await mk('barato', 300, 0);
  await prisma.product.create({ data: { slug: 'inativo', sku: 'INATIVO', name: 'Inativo', shortDesc: 'x', description: 'x', specs: {}, priceCents: 9000, stock: 0, categoryId: cat.id, active: false } });
  customer = await prisma.customer.create({ data: { code: 'CU-T1', name: 'Cliente Checkout', doc: '52998224725', email: 'c@teste.test' } });
});

test('validações que não chegam ao Asaas', { skip }, async () => {
  const noDoc = await prisma.customer.create({ data: { code: 'CU-T0', name: 'Sem Doc' } });
  assert.equal((await co.startCheckout(noDoc, { slug: 'ponteira', quantity: 1, method: 'PIX' }) as { reason: string }).reason, 'PROFILE');
  for (const [slug, quantity] of [['cotacao', 1], ['barato', 1], ['ponteira', 3], ['inativo', 1], ['nao-existe', 1], ['ponteira', 0]] as const) {
    const r = await co.startCheckout(customer, { slug, quantity, method: 'PIX' });
    assert.equal(r.ok, false, `${slug}×${quantity}`);
  }
  assert.equal(calls.length, 0, 'nenhuma chamada ao Asaas');
  assert.equal(await prisma.order.count(), 0, 'nenhum pedido criado');
});

test('PIX: pedido com preço do banco, cobrança com QR e reaproveitamento no duplo clique', { skip }, async () => {
  const r = await co.startCheckout(customer, { slug: 'ponteira', quantity: 2, method: 'PIX' });
  assert.ok(r.ok && !r.reused);
  const again = await co.startCheckout(customer, { slug: 'ponteira', quantity: 2, method: 'PIX' });
  assert.deepEqual(again, { ok: true, orderNumber: (r as { orderNumber: string }).orderNumber, reused: true });

  const orders = await prisma.order.findMany({ include: { payments: true, items: true } });
  assert.equal(orders.length, 1);
  const [o] = orders;
  assert.equal(o.totalCents, 10_000);
  assert.equal(o.status, 'ORCAMENTO');
  assert.equal(o.paymentStatus, 'PENDENTE');
  assert.equal(o.source, 'SITE');
  assert.ok(o.publicToken);
  assert.equal(o.payments.length, 1);
  const p = o.payments[0];
  assert.equal(p.method, 'PIX');
  assert.equal(p.amountCents, 10_000);
  assert.equal(p.pixPayload, '00020126PIXCOPIAECOLA');
  assert.ok(p.pixQrImage && p.invoiceUrl);

  const created = calls.filter((c) => c.method === 'POST' && c.path === '/payments');
  assert.equal(created.length, 1, 'uma cobrança só, apesar do segundo clique');
  assert.equal(created[0].body?.billingType, 'PIX');
  assert.equal(created[0].body?.value, 100);
  assert.equal(created[0].body?.externalReference, p.id);
  assert.equal((calls.find((c) => c.path === '/customers')?.body as { cpfCnpj: string }).cpfCnpj, '52998224725');
});

test('trocar para cartão/boleto cancela a cobrança PIX aberta e reusa o pedido', { skip }, async () => {
  await co.startCheckout(customer, { slug: 'ponteira', quantity: 1, method: 'PIX' });
  const r = await co.startCheckout(customer, { slug: 'ponteira', quantity: 1, method: 'CLIENTE_ESCOLHE' });
  assert.ok(r.ok && r.reused, JSON.stringify(r));
  assert.equal(await prisma.order.count(), 1);
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'asc' } });
  assert.deepEqual(payments.map((p) => [p.method, p.status]), [['PIX', 'CANCELADO'], ['CLIENTE_ESCOLHE', 'PENDENTE']]);
  assert.ok(calls.some((c) => c.method === 'DELETE' && c.path === `/payments/${payments[0].externalId}`), 'cobrança PIX removida no Asaas');
  const order = await prisma.order.findFirstOrThrow();
  assert.equal(order.paymentStatus, 'PENDENTE');
});

test('falha no Asaas: pedido fica sem cobrança e a nova tentativa reusa o mesmo pedido', { skip }, async () => {
  failNextPayment = true;
  const fail = await co.startCheckout(customer, { slug: 'ponteira', quantity: 1, method: 'PIX' });
  assert.equal(fail.ok, false);
  assert.equal((fail as { reason: string }).reason, 'PROVIDER');
  assert.doesNotMatch((fail as { message: string }).message, /Serviço indisponível/, 'detalhe do provedor não vai para o cliente');
  assert.match((fail as { message: string }).message, /Tente de novo/);
  assert.equal(await prisma.payment.count(), 0, 'registro local descartado quando o Asaas recusa');

  const ok = await co.startCheckout(customer, { slug: 'ponteira', quantity: 1, method: 'PIX' });
  assert.ok(ok.ok && ok.reused);
  assert.equal(await prisma.order.count(), 1, 'sem pedidos órfãos duplicados');
  assert.equal(await prisma.payment.count(), 1);
});

test('vencimento no fuso de Brasília', { skip }, () => {
  // 02:30 UTC do dia 29 ainda é dia 28 em Brasília
  assert.equal(co.dueDateBR(0, new Date('2026-09-29T02:30:00Z')), '2026-09-28');
  assert.equal(co.dueDateBR(1, new Date('2026-09-29T02:30:00Z')), '2026-09-29');
});
