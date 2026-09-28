// Conciliação por consulta: Postgres DESCARTÁVEL (apaga dados) + Asaas SIMULADO.
//   TEST_DATABASE_URL=postgresql://... npm test
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'defina TEST_DATABASE_URL para rodar';

let prisma: typeof import('@/lib/db').prisma;
let rec: typeof import('./asaas-reconcile');
let wh: typeof import('@/lib/integrations/asaas/webhook');
let runJobs: typeof import('@/lib/infrastructure/jobs/runner').runJobs;
let jobHandlers: typeof import('@/lib/infrastructure/jobs/handlers').jobHandlers;
const realFetch = globalThis.fetch;
const realInfo = console.info;

let remoteStatus = 'PENDING';
let gets = 0;
let emails = 0;

function fakeAsaas(input: string | URL | Request, init?: RequestInit) {
  const path = new URL(String(input)).pathname.replace(/^\/v3/, '');
  const json = (status: number, data: unknown) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  if ((init?.method ?? 'GET') === 'GET' && path === '/payments/pay_R1') {
    gets++;
    return json(200, { id: 'pay_R1', customer: 'cus_1', status: remoteStatus, billingType: 'PIX', value: 50, netValue: 49.5, dueDate: '2026-09-29', paymentDate: remoteStatus === 'RECEIVED' ? '2026-09-28' : null });
  }
  return json(404, { errors: [{ description: `rota não simulada ${path}` }] });
}

before(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  process.env.ASAAS_API_URL = 'https://api-sandbox.asaas.com/v3';
  process.env.ASAAS_API_KEY_SANDBOX = '$aact_hmlg_teste_simulado';
  process.env.RESEND_API_KEY = '';
  globalThis.fetch = fakeAsaas as typeof fetch;
  // Sem Resend o e-mail vai para o console: conta os "Pagamento confirmado"
  console.info = (...args: unknown[]) => {
    if (String(args[0] ?? '').includes('Pagamento confirmado')) emails++;
  };
  prisma = (await import('@/lib/db')).prisma;
  rec = await import('./asaas-reconcile');
  wh = await import('@/lib/integrations/asaas/webhook');
  ({ runJobs } = await import('@/lib/infrastructure/jobs/runner'));
  ({ jobHandlers } = await import('@/lib/infrastructure/jobs/handlers'));
});
after(async () => { globalThis.fetch = realFetch; console.info = realInfo; await prisma?.$disconnect(); });

let orderId = '';
beforeEach(async () => {
  if (!url) return;
  remoteStatus = 'PENDING'; gets = 0; emails = 0;
  await prisma.$executeRawUnsafe('TRUNCATE "Job","WebhookInbox","Customer" CASCADE');
  const c = await prisma.customer.create({ data: { code: 'CU-R1', name: 'Cliente Conciliação', email: 'r@teste.test' } });
  const o = await prisma.order.create({
    data: { number: 'SO-R1', customerId: c.id, status: 'ORCAMENTO', items: { create: [{ name: 'Ponteira', quantity: 1, unitPriceCents: 5000 }] } },
  });
  orderId = o.id;
  await prisma.payment.create({ data: { orderId: o.id, provider: 'ASAAS', method: 'PIX', amountCents: 5000, externalId: 'pay_R1' } });
});

test('webhook nunca chegou: a consulta direta dá a baixa', { skip }, async () => {
  remoteStatus = 'RECEIVED';
  const r = await rec.syncOrderPayments(orderId);
  assert.deepEqual(r, { checked: 1, changed: 1, failed: 0 });
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(o.paymentStatus, 'PAGO');
  assert.equal(o.status, 'PEDIDO');
  assert.equal(emails, 1);
});

test('ainda pendente: não muda nada e respeita o intervalo mínimo entre consultas', { skip }, async () => {
  assert.deepEqual(await rec.syncOrderPayments(orderId), { checked: 1, changed: 0, failed: 0 });
  assert.deepEqual(await rec.syncOrderPayments(orderId), { checked: 0, changed: 0, failed: 0 }, 'segunda consulta dentro de 15 s não chama o Asaas');
  assert.equal(gets, 1);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).paymentStatus, 'PENDENTE');
});

test('conciliação geral pega cobranças abertas e ignora as já pagas', { skip }, async () => {
  remoteStatus = 'RECEIVED';
  assert.deepEqual(await rec.reconcileOpenPayments({ minIntervalMs: 0 }), { checked: 1, changed: 1, failed: 0 });
  assert.deepEqual(await rec.reconcileOpenPayments({ minIntervalMs: 0 }), { checked: 0, changed: 0, failed: 0 });
});

test('webhook e consulta ao mesmo tempo: uma baixa, um e-mail', { skip }, async () => {
  remoteStatus = 'RECEIVED';
  await wh.ingestAsaasWebhook({ id: 'evt_R1', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_R1', customer: 'cus_1', status: 'RECEIVED', billingType: 'PIX', value: 50, dueDate: '2026-09-29' } });
  await Promise.all([
    runJobs(jobHandlers, { budgetMs: 5_000 }),
    rec.syncOrderPayments(orderId, 0),
    rec.reconcileOpenPayments({ minIntervalMs: 0 }),
  ]);
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(o.paymentStatus, 'PAGO');
  assert.equal(o.paidCents, 5000);
  assert.equal(emails, 1, 'e-mail de pagamento confirmado sai uma vez só');
  const transitions = await prisma.orderEvent.count({ where: { orderId, type: 'PAYMENT', message: { contains: '→ Recebido' } } });
  assert.equal(transitions, 1);
});
