// Fila durável no Postgres (server-only). O job é gravado na mesma transação do
// fato de negócio (outbox transacional) e reivindicado com lease + SKIP LOCKED.
// Nada de setTimeout/promessa solta: se o processo cair, o lease expira e outro
// executor retoma. Handlers precisam ser idempotentes (entrega at-least-once).
import crypto from 'node:crypto';
import { Prisma, type Job } from '@prisma/client';
import { prisma } from '@/lib/db';

type Db = Prisma.TransactionClient | typeof prisma;

export type EnqueueInput = {
  type: string;
  /** Identidade do fato de negócio: o mesmo (type, dedupeKey) nunca vira dois jobs. */
  dedupeKey: string;
  payload: Prisma.InputJsonValue;
  concurrencyKey?: string | null;
  runAt?: Date;
  maxAttempts?: number;
};

/** Enfileira sem abortar a transação em caso de duplicata (ON CONFLICT DO NOTHING). */
export async function enqueueJob(db: Db, input: EnqueueInput) {
  await db.job.createMany({
    data: [{
      type: input.type,
      dedupeKey: input.dedupeKey,
      payload: input.payload,
      concurrencyKey: input.concurrencyKey ?? null,
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? 8,
    }],
    skipDuplicates: true,
  });
}

/** Erro que não adianta repetir (payload inválido, regra de negócio): vai direto para DEAD. */
export class PermanentJobError extends Error {}

// As colunas são TIMESTAMP (sem fuso) gravadas em UTC pelo Prisma.
const NOW = Prisma.sql`(now() AT TIME ZONE 'UTC')`;
// Tolerância à diferença de relógio app × banco: o runAt vem do app (new Date()).
const CLOCK_SKEW = Prisma.sql`interval '5 seconds'`;
// Transações de fila esperam o banco "acordar" (Prisma Postgres leva até ~1 min).
export const QUEUE_TX = { maxWait: 60_000, timeout: 30_000 } as const;
// Serializa as reivindicações: garante que dois executores não peguem jobs da
// mesma concurrencyKey ao mesmo tempo. É uma transação curta; não limita a execução.
const CLAIM_LOCK = 7_300_001;

export const newWorkerId = () => `w_${crypto.randomBytes(6).toString('hex')}`;

export async function claimJobs(workerId: string, opts: { limit?: number; leaseMs?: number; types?: string[] } = {}) {
  const limit = opts.limit ?? 5;
  const leaseSeconds = Math.ceil((opts.leaseMs ?? 5 * 60_000) / 1000);
  const typeFilter = opts.types?.length ? Prisma.sql`AND j."type" = ANY(${opts.types})` : Prisma.empty;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${CLAIM_LOCK}::bigint)::text AS locked`;

    // Lease vencido na última tentativa: não roda de novo sozinho
    await tx.$executeRaw`
      UPDATE "Job" SET "status" = 'DEAD', "lockedBy" = NULL, "lockedUntil" = NULL, "updatedAt" = ${NOW},
        "lastError" = COALESCE("lastError", '') || ' [lease expirou na última tentativa]'
      WHERE "status" = 'RUNNING' AND "lockedUntil" < ${NOW} AND "attempts" >= "maxAttempts"`;

    return tx.$queryRaw<Job[]>`
      WITH candidates AS (
        SELECT DISTINCT ON (COALESCE(j."concurrencyKey", j."id")) j."id", j."runAt"
        FROM "Job" j
        WHERE (
            (j."status" = 'PENDING' AND j."runAt" <= ${NOW} + ${CLOCK_SKEW})
            OR (j."status" = 'RUNNING' AND j."lockedUntil" < ${NOW})
          )
          ${typeFilter}
          AND NOT EXISTS (
            SELECT 1 FROM "Job" r
            WHERE j."concurrencyKey" IS NOT NULL AND r."concurrencyKey" = j."concurrencyKey"
              AND r."id" <> j."id" AND r."status" = 'RUNNING' AND r."lockedUntil" >= ${NOW}
          )
        ORDER BY COALESCE(j."concurrencyKey", j."id"), j."runAt", j."createdAt"
      ),
      picked AS (
        SELECT "id" FROM "Job"
        WHERE "id" IN (SELECT "id" FROM candidates)
          -- Reavaliado sobre a versão mais nova da linha após o lock: um job
          -- concluído/falhado entre o snapshot e o lock não é ressuscitado
          AND (("status" = 'PENDING' AND "runAt" <= ${NOW} + ${CLOCK_SKEW})
               OR ("status" = 'RUNNING' AND "lockedUntil" < ${NOW}))
        ORDER BY "runAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "Job" SET
        "status" = 'RUNNING',
        "lockedBy" = ${workerId},
        "lockedUntil" = ${NOW} + make_interval(secs => ${leaseSeconds}),
        "attempts" = "attempts" + 1,
        "updatedAt" = ${NOW}
      WHERE "id" IN (SELECT "id" FROM picked)
      RETURNING *`;
  }, QUEUE_TX);
}

/**
 * Renova o lease antes de cada handler. false = o lease foi perdido (expirou e
 * outro executor pegou): o job NÃO deve rodar aqui.
 */
export async function extendLease(job: Job, workerId: string, leaseMs = 5 * 60_000) {
  const n = await prisma.$executeRaw`
    UPDATE "Job" SET "lockedUntil" = ${NOW} + make_interval(secs => ${Math.ceil(leaseMs / 1000)}), "updatedAt" = ${NOW}
    WHERE "id" = ${job.id} AND "lockedBy" = ${workerId} AND "status" = 'RUNNING' AND "lockedUntil" > ${NOW}`;
  return n === 1;
}

/** Só conclui se o lease ainda for deste executor. */
export async function completeJob(job: Job, workerId: string) {
  await prisma.job.updateMany({
    where: { id: job.id, lockedBy: workerId, status: 'RUNNING' },
    data: { status: 'DONE', completedAt: new Date(), lockedBy: null, lockedUntil: null, lastError: null },
  });
}

/** Devolve à fila um job reivindicado que não chegou a rodar (sem contar tentativa). */
export async function releaseJob(job: Job, workerId: string) {
  await prisma.job.updateMany({
    where: { id: job.id, lockedBy: workerId, status: 'RUNNING' },
    data: { status: 'PENDING', lockedBy: null, lockedUntil: null, attempts: { decrement: 1 } },
  });
}

/** Backoff exponencial com jitter: 30 s, 1 min, 2 min… até 1 h. */
export function retryDelayMs(attempts: number, random = Math.random) {
  const base = Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 60 * 60_000);
  return Math.round(base * (0.8 + random() * 0.4));
}

export async function failJob(job: Job, workerId: string, error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
  const dead = error instanceof PermanentJobError || job.attempts >= job.maxAttempts;
  await prisma.job.updateMany({
    where: { id: job.id, lockedBy: workerId, status: 'RUNNING' },
    data: dead
      ? { status: 'DEAD', lastError: message, lockedBy: null, lockedUntil: null }
      : { status: 'PENDING', lastError: message, lockedBy: null, lockedUntil: null, runAt: new Date(Date.now() + retryDelayMs(job.attempts)) },
  });
  return dead ? ('dead' as const) : ('retry' as const);
}

/** Recoloca um job DEAD na fila (ação manual do admin). */
export async function retryDeadJob(id: string) {
  return prisma.job.updateMany({
    where: { id, status: 'DEAD' },
    data: { status: 'PENDING', runAt: new Date(), attempts: 0, lastError: null },
  });
}
