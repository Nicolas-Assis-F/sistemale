// Sincronização Asaas → banco (server-only, NÃO é Server Action: nunca exportar
// isto de um arquivo 'use server', ou viraria endpoint público sem autenticação).
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_STATUS_LABELS } from '@/lib/finance-labels';
import { mapAsaasStatus, paidAtFrom, toCents, billingToMethod, type AsaasPayment } from '@/lib/asaas';
import { logOrderEvent, PAID_STATUSES, recalcOrder, type Actor } from './ledger';
import { notifyPaymentConfirmed } from './notify';

/**
 * Aplica o estado de uma cobrança do Asaas ao registro local. Usado pelo webhook,
 * pela consulta direta (lib/orders/asaas-reconcile.ts) e pelo botão "Atualizar"
 * do painel — que podem rodar ao mesmo tempo. A gravação é condicional à versão
 * lida (updatedAt): se outra execução gravou no meio, relê e reaplica. Assim só
 * quem efetivamente muda o status registra o evento e manda o e-mail.
 */
export async function applyAsaasPayment(localId: string, remote: AsaasPayment, actor: Actor) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const local = await prisma.payment.findUniqueOrThrow({ where: { id: localId } });
    const status = mapAsaasStatus(remote.status, remote.deleted);
    const { count } = await prisma.payment.updateMany({
      where: { id: localId, updatedAt: local.updatedAt },
      data: {
        status,
        amountCents: toCents(remote.value),
        netCents: remote.netValue !== undefined ? toCents(remote.netValue) : local.netCents,
        paidAt: paidAtFrom(remote) ?? local.paidAt,
        dueDate: remote.dueDate ? new Date(`${remote.dueDate}T12:00:00`) : local.dueDate,
        invoiceUrl: remote.invoiceUrl ?? local.invoiceUrl,
        bankSlipUrl: remote.bankSlipUrl ?? local.bankSlipUrl,
        lastSyncedAt: new Date(),
      },
    });
    if (count === 0) continue; // outra execução atualizou esta cobrança agora: relê

    if (status !== local.status) {
      await logOrderEvent(
        prisma, local.orderId, 'PAYMENT',
        `Cobrança ${formatCurrency(toCents(remote.value))}: ${PAYMENT_STATUS_LABELS[local.status]} → ${PAYMENT_STATUS_LABELS[status]}`,
        actor, { paymentId: localId, externalId: remote.id, asaasStatus: remote.status },
      );
    }
    await recalcOrder(local.orderId, actor);
    const paidNow = PAID_STATUSES.includes(status) && !PAID_STATUSES.includes(local.status);
    if (paidNow) await notifyPaymentConfirmed(local.orderId, toCents(remote.value));
    return { changed: status !== local.status, status };
  }
  throw new Error('Cobrança alterada por outra execução repetidamente; tente de novo.');
}


/**
 * Resolve o registro local de uma cobrança recebida do Asaas: pelo id remoto ou,
 * para parcelas novas de um parcelamento, pelo externalReference (id do Payment
 * original) — criando o registro da parcela.
 */
export async function findOrCreateLocalPayment(remote: AsaasPayment) {
  const byExternal = await prisma.payment.findUnique({ where: { externalId: remote.id } });
  if (byExternal) return byExternal;
  if (!remote.externalReference) return null;
  const origin = await prisma.payment.findUnique({ where: { id: remote.externalReference } });
  if (!origin) return null;
  if (!origin.externalId) {
    return prisma.payment.update({ where: { id: origin.id }, data: { externalId: remote.id } });
  }
  const created = await prisma.payment.create({
    data: {
      orderId: origin.orderId,
      provider: 'ASAAS',
      method: billingToMethod(remote.billingType),
      status: mapAsaasStatus(remote.status, remote.deleted),
      amountCents: toCents(remote.value),
      dueDate: remote.dueDate ? new Date(`${remote.dueDate}T12:00:00`) : null,
      description: origin.description,
      externalId: remote.id,
      invoiceUrl: remote.invoiceUrl ?? null,
      bankSlipUrl: remote.bankSlipUrl ?? null,
      installmentCount: origin.installmentCount,
    },
  });
  await logOrderEvent(prisma, origin.orderId, 'PAYMENT', `Parcela registrada: ${formatCurrency(created.amountCents)}`, 'asaas', { paymentId: created.id, externalId: remote.id });
  return created;
}
