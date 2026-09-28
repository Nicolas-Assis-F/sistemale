// Webhook Asaas em duas etapas (server-only, NÃO é Server Action):
//  1. ingestAsaasWebhook: grava a inbox + o job na mesma transação → a rota responde 2xx;
//  2. processAsaasWebhook (job): consulta o Asaas pela cobrança e aplica o estado atual.
// Consultar a API em vez de confiar no payload torna eventos fora de ordem inofensivos:
// o registro local sempre converge para o estado vigente no Asaas.
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AsaasError, asaasConfigured, asaasEnv, getAsaasPayment, type AsaasPayment } from '@/lib/asaas';
import { applyAsaasPayment, findOrCreateLocalPayment } from '@/lib/orders/asaas-sync';
import { enqueueJob, PermanentJobError, QUEUE_TX } from '@/lib/infrastructure/jobs/queue';

export const ASAAS_WEBHOOK_JOB = 'asaas.webhook';

export type AsaasWebhookBody = { id: string; event: string; payment?: AsaasPayment };

/** Persiste a notificação. Duplicatas (mesmo id de evento) não geram novo job. */
export async function ingestAsaasWebhook(body: AsaasWebhookBody) {
  const account = asaasEnv();
  return prisma.$transaction(async (tx) => {
    await tx.webhookInbox.createMany({
      data: [{ provider: 'asaas', account, dedupeKey: body.id, eventType: body.event, payload: body as unknown as Prisma.InputJsonValue }],
      skipDuplicates: true,
    });
    const inbox = await tx.webhookInbox.findUniqueOrThrow({
      where: { provider_account_dedupeKey: { provider: 'asaas', account, dedupeKey: body.id } },
      select: { id: true, status: true },
    });
    await enqueueJob(tx, {
      type: ASAAS_WEBHOOK_JOB,
      dedupeKey: inbox.id,
      payload: { inboxId: inbox.id },
      // Eventos da mesma cobrança rodam em série (evita notificação/baixa em dobro)
      concurrencyKey: body.payment?.id ? `asaas-payment:${body.payment.id}` : null,
    });
    // Reentrega de um evento ainda não aplicado cujo job parou (tentativas esgotadas,
    // lease vencido, função encerrada): vale como novo pedido de retry
    if (inbox.status === 'RECEIVED' || inbox.status === 'FAILED') {
      await tx.job.updateMany({
        where: { type: ASAAS_WEBHOOK_JOB, dedupeKey: inbox.id, status: 'DEAD' },
        data: { status: 'PENDING', runAt: new Date(), attempts: 0 },
      });
    }
    return { inboxId: inbox.id, duplicate: inbox.status !== 'RECEIVED' };
  }, QUEUE_TX);
}

const jobPayload = z.object({ inboxId: z.string().min(1) });

export async function processAsaasWebhook(raw: unknown) {
  const parsed = jobPayload.safeParse(raw);
  if (!parsed.success) throw new PermanentJobError('payload do job inválido');
  const inbox = await prisma.webhookInbox.findUnique({ where: { id: parsed.data.inboxId } });
  if (!inbox) throw new PermanentJobError('inbox não encontrada');
  if (inbox.status === 'PROCESSED' || inbox.status === 'IGNORED') return;

  const body = inbox.payload as unknown as AsaasWebhookBody;
  try {
    const outcome = await applyEvent(body);
    await prisma.webhookInbox.update({
      where: { id: inbox.id },
      data: { status: outcome, processedAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.webhookInbox.update({
      where: { id: inbox.id },
      data: { status: 'FAILED', attempts: { increment: 1 }, lastError: message.slice(0, 1000) },
    });
    throw error;
  }
}

async function applyEvent(body: AsaasWebhookBody): Promise<'PROCESSED' | 'IGNORED'> {
  if (!body.event.startsWith('PAYMENT_') || !body.payment?.id) return 'IGNORED';
  const remote = await currentPayment(body);
  const local = await findOrCreateLocalPayment(remote);
  // Cobranças criadas fora do sistema (sem externalReference nosso) são apenas registradas
  if (!local) return 'IGNORED';
  await applyAsaasPayment(local.id, remote, 'asaas');
  return 'PROCESSED';
}

/**
 * Estado vigente da cobrança no Asaas (inclui `deleted`), não o do evento: um
 * PAYMENT_DELETED atrasado não cancela uma cobrança já restaurada. O payload
 * só é usado sem integração ativa.
 */
async function currentPayment(body: AsaasWebhookBody): Promise<AsaasPayment> {
  const fromPayload = body.event === 'PAYMENT_DELETED' ? { ...body.payment!, deleted: true } : body.payment!;
  if (!asaasConfigured()) return fromPayload;
  try {
    return await getAsaasPayment(body.payment!.id);
  } catch (error) {
    // Cobrança removida pode não ser mais consultável
    if (error instanceof AsaasError && error.status === 404) return { ...body.payment!, deleted: true };
    throw error;
  }
}
