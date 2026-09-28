// Conciliação por consulta (server-only, NÃO é Server Action). O webhook é o
// caminho rápido, mas pode falhar (evento não marcado no Asaas, fila pausada,
// token trocado). Aqui o sistema pergunta ao Asaas pelo estado das cobranças
// abertas: nenhum pagamento fica esperando só pelo webhook. §3 do plano.
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { asaasConfigured, getAsaasPayment } from '@/lib/asaas';
import { applyAsaasPayment } from './asaas-sync';
import type { Actor } from './ledger';

const OPEN = ['PENDENTE', 'VENCIDO'] as const;

export type ReconcileSummary = { checked: number; changed: number; failed: number };

/**
 * Reserva a cobrança para consulta: só uma execução por intervalo (várias abas,
 * refresh da página, cron) chega a chamar o Asaas para a mesma cobrança.
 */
async function reserve(paymentId: string, minIntervalMs: number) {
  const threshold = new Date(Date.now() - minIntervalMs);
  const { count } = await prisma.payment.updateMany({
    where: { id: paymentId, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: threshold } }] },
    data: { lastSyncedAt: new Date() },
  });
  return count === 1;
}

async function syncPayments(where: Prisma.PaymentWhereInput, opts: { minIntervalMs: number; limit: number; actor: Actor }): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { checked: 0, changed: 0, failed: 0 };
  if (!asaasConfigured()) return summary;
  const threshold = new Date(Date.now() - opts.minIntervalMs);
  const payments = await prisma.payment.findMany({
    where: {
      ...where,
      provider: 'ASAAS', status: { in: [...OPEN] }, externalId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: threshold } }],
    },
    orderBy: { lastSyncedAt: { sort: 'asc', nulls: 'first' } },
    take: opts.limit,
    select: { id: true, externalId: true },
  });
  for (const p of payments) {
    if (!(await reserve(p.id, opts.minIntervalMs))) continue;
    summary.checked++;
    try {
      const r = await applyAsaasPayment(p.id, await getAsaasPayment(p.externalId!), opts.actor);
      if (r.changed) summary.changed++;
    } catch (error) {
      summary.failed++;
      console.error(`[conciliação] cobrança ${p.id}:`, error instanceof Error ? error.message : error);
    }
  }
  return summary;
}

/** Cobranças abertas de um pedido (páginas do pedido enquanto o cliente espera). */
export function syncOrderPayments(orderId: string, minIntervalMs = 15_000) {
  return syncPayments({ orderId }, { minIntervalMs, limit: 10, actor: 'sistema' });
}

/** Todas as cobranças abertas recentes (cron e botão do admin). */
export function reconcileOpenPayments(opts: { maxAgeDays?: number; minIntervalMs?: number; limit?: number } = {}) {
  const since = new Date(Date.now() - (opts.maxAgeDays ?? 45) * 86_400_000);
  return syncPayments({ createdAt: { gte: since } }, { minIntervalMs: opts.minIntervalMs ?? 10 * 60_000, limit: opts.limit ?? 50, actor: 'sistema' });
}

/**
 * Versão para renderização de página: não deixa o Asaas lento segurar a tela.
 * Se passar do tempo, a consulta continua e o próximo refresh já mostra.
 */
export async function syncOrderPaymentsQuick(orderId: string, budgetMs = 4_000) {
  const run = syncOrderPayments(orderId).catch((e) => {
    console.error('[conciliação] pedido', orderId, e instanceof Error ? e.message : e);
  });
  await Promise.race([run, new Promise((r) => setTimeout(r, budgetMs))]);
}
