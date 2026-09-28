// Teste de integração da fila contra um Postgres DESCARTÁVEL com as migrations
// aplicadas. Nunca aponte para o banco de desenvolvimento ou produção: o teste
// apaga a tabela "Job".
//   TEST_DATABASE_URL=postgresql://... npm test
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'defina TEST_DATABASE_URL para rodar';

type Queue = typeof import('./queue');
type Runner = typeof import('./runner');
let q: Queue;
let r: Runner;
let prisma: typeof import('@/lib/db').prisma;

before(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  q = await import('./queue');
  r = await import('./runner');
  prisma = (await import('@/lib/db')).prisma;
});
after(async () => { await prisma?.$disconnect(); });
beforeEach(async () => { if (url) await prisma.job.deleteMany(); });

test('enqueue é idempotente por (type, dedupeKey), inclusive dentro de transação', { skip }, async () => {
  await prisma.$transaction(async (tx) => {
    await q.enqueueJob(tx, { type: 't', dedupeKey: 'a', payload: { n: 1 } });
    await q.enqueueJob(tx, { type: 't', dedupeKey: 'a', payload: { n: 2 } });
  });
  const jobs = await prisma.job.findMany();
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].payload, { n: 1 });
});

test('claim respeita runAt, lease e SKIP LOCKED entre executores concorrentes', { skip }, async () => {
  for (let i = 0; i < 10; i++) await q.enqueueJob(prisma, { type: 't', dedupeKey: `k${i}`, payload: {} });
  await q.enqueueJob(prisma, { type: 't', dedupeKey: 'futuro', payload: {}, runAt: new Date(Date.now() + 3_600_000) });
  const [a, b, c] = await Promise.all([q.claimJobs('A', { limit: 4 }), q.claimJobs('B', { limit: 4 }), q.claimJobs('C', { limit: 4 })]);
  const ids = [...a, ...b, ...c].map((j) => j.id);
  assert.equal(ids.length, 10, 'o job futuro não é pego');
  assert.equal(new Set(ids).size, 10, 'nenhum job pego por dois executores');
  assert.ok([...a, ...b, ...c].every((j) => j.status === 'RUNNING' && j.attempts === 1));
  assert.equal((await q.claimJobs('D')).length, 0, 'lease vigente não é reivindicado');
});

test('concurrencyKey: um job por chave por vez', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 't', dedupeKey: '1', payload: {}, concurrencyKey: 'pay:1' });
  await q.enqueueJob(prisma, { type: 't', dedupeKey: '2', payload: {}, concurrencyKey: 'pay:1' });
  await q.enqueueJob(prisma, { type: 't', dedupeKey: '3', payload: {}, concurrencyKey: 'pay:2' });
  const first = await q.claimJobs('A', { limit: 10 });
  assert.deepEqual(first.map((j) => j.dedupeKey).sort(), ['1', '3']);
  assert.equal((await q.claimJobs('B', { limit: 10 })).length, 0, 'o 2 espera o 1 terminar');
  await q.completeJob(first.find((j) => j.dedupeKey === '1')!, 'A');
  assert.deepEqual((await q.claimJobs('B', { limit: 10 })).map((j) => j.dedupeKey), ['2']);
});

test('lease expirado é retomado; na última tentativa vai para DEAD', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 't', dedupeKey: 'x', payload: {}, maxAttempts: 2 });
  await q.claimJobs('A', { leaseMs: 1 });
  await new Promise((res) => setTimeout(res, 1100));
  const retaken = await q.claimJobs('B', { leaseMs: 1 });
  assert.equal(retaken.length, 1);
  assert.equal(retaken[0].attempts, 2);
  await new Promise((res) => setTimeout(res, 1100));
  assert.equal((await q.claimJobs('C')).length, 0);
  assert.equal((await prisma.job.findFirstOrThrow()).status, 'DEAD');
});

test('complete/fail só valem para o dono do lease', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 't', dedupeKey: 'x', payload: {} });
  const [job] = await q.claimJobs('A');
  await q.completeJob(job, 'intruso');
  assert.equal((await prisma.job.findFirstOrThrow()).status, 'RUNNING');
  await q.completeJob(job, 'A');
  assert.equal((await prisma.job.findFirstOrThrow()).status, 'DONE');
});

test('runner: sucesso, retry com backoff, erro permanente e tipo sem handler', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 'ok', dedupeKey: '1', payload: { v: 1 } });
  await q.enqueueJob(prisma, { type: 'falha', dedupeKey: '1', payload: {} });
  await q.enqueueJob(prisma, { type: 'permanente', dedupeKey: '1', payload: {} });
  const seen: unknown[] = [];
  const summary = await r.runJobs({
    ok: async (p) => { seen.push(p); },
    falha: async () => { throw new Error('banco fora'); },
    permanente: async () => { throw new q.PermanentJobError('payload ruim'); },
  }, { budgetMs: 5_000 });
  assert.deepEqual(summary, { done: 1, retry: 1, dead: 1, unknownType: 0, leaseLost: 0 });
  assert.deepEqual(seen, [{ v: 1 }]);
  const retry = await prisma.job.findFirstOrThrow({ where: { type: 'falha' } });
  assert.equal(retry.status, 'PENDING');
  assert.equal(retry.lastError, 'banco fora');
  assert.ok(retry.runAt.getTime() > Date.now() + 20_000, 'backoff empurra o runAt');
});

test('backoff exponencial com jitter, limitado a 1 h', { skip }, () => {
  assert.equal(q.retryDelayMs(1, () => 0.5), 30_000);
  assert.equal(q.retryDelayMs(3, () => 0.5), 120_000);
  assert.equal(q.retryDelayMs(30, () => 0.5), 3_600_000);
  assert.equal(q.retryDelayMs(1, () => 0), 24_000);
  assert.equal(q.retryDelayMs(1, () => 1), 36_000);
});

test('lease perdido no meio do lote: o job não roda neste executor', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 't', dedupeKey: 'x', payload: {} });
  const [job] = await q.claimJobs('A', { leaseMs: 1 });
  await new Promise((res) => setTimeout(res, 1100));
  assert.equal(await q.extendLease(job, 'A'), false, 'lease vencido não é renovado');
  const [retaken] = await q.claimJobs('B');
  assert.equal(await q.extendLease(retaken, 'B'), true);
  assert.equal(await q.extendLease(job, 'A'), false, 'A não recupera o job de B');
});

test('job devolvido por fim de orçamento volta à fila sem gastar tentativa', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 't', dedupeKey: 'x', payload: {} });
  const [job] = await q.claimJobs('A');
  await q.releaseJob(job, 'A');
  const row = await prisma.job.findFirstOrThrow();
  assert.equal(row.status, 'PENDING');
  assert.equal(row.attempts, 0);
});

test('tipo sem handler é pego e vai para DEAD em vez de ficar pendente', { skip }, async () => {
  await q.enqueueJob(prisma, { type: 'sem-handler', dedupeKey: 'x', payload: {}, maxAttempts: 1 });
  const s = await r.runJobs({}, { budgetMs: 3_000 });
  assert.equal(s.unknownType, 1);
  assert.equal((await prisma.job.findFirstOrThrow()).status, 'DEAD');
});

test('orçamento esgotado devolve o resto do lote', { skip }, async () => {
  for (let i = 0; i < 3; i++) await q.enqueueJob(prisma, { type: 'lento', dedupeKey: `${i}`, payload: {} });
  const s = await r.runJobs({ lento: () => new Promise((res) => setTimeout(res, 400)) }, { budgetMs: 300, batch: 3 });
  assert.equal(s.done, 1);
  const pending = await prisma.job.findMany({ where: { status: 'PENDING' } });
  assert.equal(pending.length, 2);
  assert.ok(pending.every((j) => j.attempts === 0));
});
