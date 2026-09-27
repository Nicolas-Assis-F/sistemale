// Sincronização Asaas → banco (server-only, NÃO é Server Action: nunca exportar
// isto de um arquivo 'use server', ou viraria endpoint público sem autenticação).
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_STATUS_LABELS } from '@/lib/finance-labels';
import { mapAsaasStatus, paidAtFrom, toCents, billingToMethod, type AsaasPayment } from '@/lib/asaas';
import { logOrderEvent, recalcOrder } from './ledger';
import { notifyPaymentConfirmed } from './notify';

/** Aplica o estado de uma cobrança do Asaas ao registro local (usado pelo sync e pelo webhook). */
export async function applyAsaasPayment(localId: string, remote: AsaasPayment, actor: 'admin' | 'asaas') {
  const local = await prisma.payment.findUniqueOrThrow({ where: { id: localId } });
  const status = mapAsaasStatus(remote.status, remote.deleted);
  await prisma.payment.update({
    where: { id: localId },
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
  if (status !== local.status) {
    await logOrderEvent(
      prisma, local.orderId, 'PAYMENT',
      `Cobrança ${formatCurrency(toCents(remote.value))}: ${PAYMENT_STATUS_LABELS[local.status]} → ${PAYMENT_STATUS_LABELS[status]}`,
      actor, { paymentId: localId, externalId: remote.id, asaasStatus: remote.status },
    );
  }
  await recalcOrder(local.orderId, actor);
  const paidNow = (status === 'RECEBIDO' || status === 'CONFIRMADO') && local.status !== 'RECEBIDO' && local.status !== 'CONFIRMADO';
  if (paidNow) await notifyPaymentConfirmed(local.orderId, toCents(remote.value));
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
