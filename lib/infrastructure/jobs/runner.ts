// Executor da fila (server-only). Chamado por after() nas rotas que enfileiram,
// pelo cron de recuperação (/api/cron/jobs) e pelo worker dedicado (scripts/worker.ts).
import type { Job } from '@prisma/client';
import { claimJobs, completeJob, extendLease, failJob, newWorkerId, releaseJob } from './queue';

export type JobHandler = (payload: unknown, job: Job) => Promise<void>;

export type RunSummary = { done: number; retry: number; dead: number; unknownType: number; leaseLost: number };

/** Lease de cada job: renovado imediatamente antes do handler, então vale para um job só. */
const LEASE_MS = 5 * 60_000;

export async function runJobs(
  handlers: Record<string, JobHandler>,
  opts: { budgetMs?: number; types?: string[]; batch?: number; workerId?: string } = {},
): Promise<RunSummary> {
  const workerId = opts.workerId ?? newWorkerId();
  const deadline = Date.now() + (opts.budgetMs ?? 20_000);
  const summary: RunSummary = { done: 0, retry: 0, dead: 0, unknownType: 0, leaseLost: 0 };
  // Sem filtro, tipos sem handler também são pegos e acabam DEAD (visíveis no painel)
  const types = opts.types;

  while (Date.now() < deadline) {
    const jobs = await claimJobs(workerId, { types, limit: opts.batch ?? 5, leaseMs: LEASE_MS });
    if (jobs.length === 0) break;
    for (const job of jobs) {
      // Orçamento esgotado (ex.: maxDuration da função): devolve o resto sem gastar tentativa
      if (Date.now() >= deadline) {
        await releaseJob(job, workerId);
        continue;
      }
      // Um lote pode demorar: sem lease válido o job fica para quem o reivindicou
      if (!(await extendLease(job, workerId, LEASE_MS))) {
        summary.leaseLost++;
        continue;
      }
      const handler = handlers[job.type];
      try {
        if (!handler) {
          summary.unknownType++;
          throw new Error(`sem handler para o tipo ${job.type}`);
        }
        await handler(job.payload, job);
        await completeJob(job, workerId);
        summary.done++;
      } catch (error) {
        const outcome = await failJob(job, workerId, error);
        summary[outcome === 'dead' ? 'dead' : 'retry']++;
        console.error(`[jobs] ${job.type} ${job.id} tentativa ${job.attempts}/${job.maxAttempts} → ${outcome}:`, error instanceof Error ? error.message : error);
      }
    }
  }
  return summary;
}
