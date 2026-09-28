// Integração: webhook Asaas → inbox → job → baixa do pedido. Postgres DESCARTÁVEL
// (apaga dados). Sem chave do Asaas: o handler usa o payload do evento.
//   TEST_DATABASE_URL=postgresql://... npm test
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'defina TEST_DATABASE_URL para rodar';

let prisma: typeof import('@/lib/db').prisma;
let wh: typeof import('./webhook');
let runJobs: typeof import('@/lib/infrastructure/jobs/runner').runJobs;
let jobHandlers: typeof import('@/lib/infrastructure/jobs/handlers').jobHandlers;

before(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  process.env.ASAAS_API_KEY = '';
  process.env.ASAAS_API_KEY_SANDBOX = '';
  prisma = (await import('@/lib/db')).prisma;
  wh = await import('./webhook');
  ({ runJobs } = await import('@/lib/infrastructure/jobs/runner'));
  ({ jobHandlers } = await import('@/lib/infrastructure/jobs/handlers'));
});
after(async () => { await prisma?.$disconnect(); });

beforeEach(async () => {
  if (!url) return;
  await prisma.job.deleteMany();
  await prisma.webhookInbox.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
});

async function seedOrder() {
  const customer = await prisma.customer.create({ data: { code: 'CU-T1', name: 'Cliente Teste' } });
  const order = await prisma.order.create({
    data: {
      number: 'SO-T1', customerId: customer.id, status: 'ORCAMENTO', totalCents: 10_000,
      items: { create: [{ name: 'Cabeçote', quantity: 1, unitPriceCents: 10_000 }] },
    },
  });
  const payment = await prisma.payment.create({
    data: { orderId: order.id, provider: 'ASAAS', method: 'PIX', amountCents: 10_000, externalId: 'pay_T1' },
  });
  return { order, payment };
}

const event = (id: string, event: string, status: string) => ({
  id, event,
  payment: { id: 'pay_T1', customer: 'cus_1', status, billingType: 'PIX' as const, value: 100, netValue: 99.01, dueDate: '2026-10-01', paymentDate: '2026-09-28' },
});

test('evento repetido gera uma inbox e um job; processamento quita o pedido', { skip }, async () => {
  const { order, payment } = await seedOrder();
  const first = await wh.ingestAsaasWebhook(event('evt_1', 'PAYMENT_RECEIVED', 'RECEIVED'));
  const again = await wh.ingestAsaasWebhook(event('evt_1', 'PAYMENT_RECEIVED', 'RECEIVED'));
  assert.equal(first.inboxId, again.inboxId);
  assert.equal(await prisma.webhookInbox.count(), 1);
  assert.equal(await prisma.job.count(), 1);

  const summary = await runJobs(jobHandlers, { budgetMs: 5_000 });
  assert.equal(summary.done, 1);

  const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(p.status, 'RECEBIDO');
  assert.equal(p.netCents, 9_901);
  const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(o.paymentStatus, 'PAGO');
  assert.equal(o.paidCents, 10_000);
  assert.equal(o.status, 'PEDIDO', 'orçamento quitado vira pedido');
  const inbox = await prisma.webhookInbox.findFirstOrThrow();
  assert.equal(inbox.status, 'PROCESSED');

  // Reentrega depois de processado: confirma como duplicata e não reprocessa
  const late = await wh.ingestAsaasWebhook(event('evt_1', 'PAYMENT_RECEIVED', 'RECEIVED'));
  assert.equal(late.duplicate, true);
  assert.equal((await runJobs(jobHandlers, { budgetMs: 2_000 })).done, 0);
});

test('eventos da mesma cobrança são processados em série e sem baixa dupla', { skip }, async () => {
  const { order } = await seedOrder();
  await wh.ingestAsaasWebhook(event('evt_a', 'PAYMENT_CONFIRMED', 'CONFIRMED'));
  await wh.ingestAsaasWebhook(event('evt_b', 'PAYMENT_RECEIVED', 'RECEIVED'));
  const results = await Promise.all([runJobs(jobHandlers, { budgetMs: 5_000 }), runJobs(jobHandlers, { budgetMs: 5_000 })]);
  assert.equal(results.reduce((s, r) => s + r.done, 0), 2);
  const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(o.paidCents, 10_000);
  const statusChanges = await prisma.orderEvent.count({ where: { orderId: order.id, type: 'STATUS' } });
  assert.equal(statusChanges, 1);
});

test('evento de cobrança desconhecida ou não-PAYMENT é IGNORED', { skip }, async () => {
  await wh.ingestAsaasWebhook({ id: 'evt_x', event: 'PAYMENT_CREATED', payment: { ...event('', '', 'PENDING').payment, id: 'pay_fora' } });
  await wh.ingestAsaasWebhook({ id: 'evt_y', event: 'TRANSFER_DONE' });
  await runJobs(jobHandlers, { budgetMs: 5_000 });
  const statuses = (await prisma.webhookInbox.findMany()).map((i) => i.status);
  assert.deepEqual(statuses, ['IGNORED', 'IGNORED']);
});

test('reentrega de evento com falha esgotada reabre o job parado', { skip }, async () => {
  const { inboxId } = await wh.ingestAsaasWebhook(event('evt_d', 'PAYMENT_RECEIVED', 'RECEIVED'));
  await prisma.webhookInbox.update({ where: { id: inboxId }, data: { status: 'FAILED', lastError: 'x' } });
  await prisma.job.updateMany({ data: { status: 'DEAD', attempts: 8 } });
  await wh.ingestAsaasWebhook(event('evt_d', 'PAYMENT_RECEIVED', 'RECEIVED'));
  const job = await prisma.job.findFirstOrThrow();
  assert.equal(job.status, 'PENDING');
  assert.equal(job.attempts, 0);
  assert.equal(await prisma.job.count(), 1);
});

test('reentrega reabre job parado mesmo com a inbox ainda RECEIVED (lease vencido)', { skip }, async () => {
  await wh.ingestAsaasWebhook(event('evt_r', 'PAYMENT_RECEIVED', 'RECEIVED'));
  await prisma.job.updateMany({ data: { status: 'DEAD', attempts: 8 } });
  await wh.ingestAsaasWebhook(event('evt_r', 'PAYMENT_RECEIVED', 'RECEIVED'));
  assert.equal((await prisma.job.findFirstOrThrow()).status, 'PENDING');
});

test('evento já processado não reabre job', { skip }, async () => {
  await seedOrder();
  await wh.ingestAsaasWebhook(event('evt_p', 'PAYMENT_RECEIVED', 'RECEIVED'));
  await runJobs(jobHandlers, { budgetMs: 5_000 });
  await prisma.job.updateMany({ data: { status: 'DEAD' } });
  await wh.ingestAsaasWebhook(event('evt_p', 'PAYMENT_RECEIVED', 'RECEIVED'));
  assert.equal((await prisma.job.findFirstOrThrow()).status, 'DEAD');
});
