// Núcleo financeiro do pedido (server-only). Toda mudança em itens, pagamentos,
// status ou comissões passa por recalcOrder(): uma única regra para o painel,
// o webhook do Asaas e a página pública do cliente.
import crypto from 'node:crypto';
import type {
  CommissionStatus, OrderPaymentStatus, OrderStatus, PaymentStatus, Prisma,
} from '@prisma/client';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { ORDER_PAYMENT_LABELS } from '@/lib/finance-labels';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';

type Db = Prisma.TransactionClient | typeof prisma;
export type Actor = 'admin' | 'asaas' | 'cliente' | 'sistema';

/** Pagamentos que contam como dinheiro recebido (CONFIRMADO = cartão aprovado). */
export const PAID_STATUSES: PaymentStatus[] = ['CONFIRMADO', 'RECEBIDO'];

export function logOrderEvent(
  db: Db,
  orderId: string,
  type: string,
  message: string,
  actor: Actor = 'admin',
  meta?: Prisma.InputJsonValue,
) {
  return db.orderEvent.create({ data: { orderId, type, message, actor, meta } });
}

export function computeCommission(baseCents: number, bps: number) {
  return Math.round((baseCents * bps) / 10_000);
}

function derivePaymentStatus(totalCents: number, payments: { status: PaymentStatus; amountCents: number }[]) {
  const active = payments.filter((p) => p.status !== 'CANCELADO');
  const paidCents = active.filter((p) => PAID_STATUSES.includes(p.status)).reduce((s, p) => s + p.amountCents, 0);
  let status: OrderPaymentStatus;
  if (active.length === 0) status = 'NAO_COBRADO';
  else if (paidCents === 0 && active.every((p) => p.status === 'ESTORNADO')) status = 'ESTORNADO';
  else if (paidCents > 0 && paidCents >= totalCents) status = 'PAGO';
  else if (paidCents > 0) status = 'PARCIAL';
  else status = 'PENDENTE';
  return { paidCents, status };
}

/**
 * Regra das comissões:
 *  - valor = total do pedido × percentual (recalculado enquanto não estiver PAGA);
 *  - LIBERADA (a pagar) quando o pedido fica 100% pago — ou manualmente pelo admin;
 *  - volta a PENDENTE se o pagamento for estornado; CANCELADA se o pedido for cancelado.
 */
function nextCommissionStatus(current: CommissionStatus, orderStatus: OrderStatus, paymentStatus: OrderPaymentStatus): CommissionStatus {
  if (current === 'PAGA') return 'PAGA';
  if (orderStatus === 'CANCELADO') return 'CANCELADA';
  if (paymentStatus === 'PAGO') return 'LIBERADA';
  if (paymentStatus === 'ESTORNADO') return 'PENDENTE';
  if (current === 'CANCELADA') return 'PENDENTE';
  return current; // mantém liberação manual
}

/** Recalcula totais, situação financeira, status automático e comissões do pedido. */
export async function recalcOrder(orderId: string, actor: Actor = 'sistema') {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: { select: { quantity: true, unitPriceCents: true } },
        payments: { select: { status: true, amountCents: true } },
        commissions: true,
      },
    });

    const totalCents = order.items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
    const { paidCents, status: paymentStatus } = derivePaymentStatus(totalCents, order.payments);

    // Orçamento quitado = aprovado: vira pedido automaticamente
    let status = order.status;
    if (paymentStatus === 'PAGO' && order.paymentStatus !== 'PAGO' && order.status === 'ORCAMENTO') {
      status = 'PEDIDO';
      await logOrderEvent(tx, orderId, 'STATUS', `Status: ${ORDER_STATUS_LABELS.ORCAMENTO} → ${ORDER_STATUS_LABELS.PEDIDO} (pagamento confirmado)`, 'sistema');
    }

    if (paymentStatus !== order.paymentStatus) {
      await logOrderEvent(
        tx, orderId, 'PAYMENT',
        `Situação financeira: ${ORDER_PAYMENT_LABELS[order.paymentStatus]} → ${ORDER_PAYMENT_LABELS[paymentStatus]} · ${formatCurrency(paidCents)} de ${formatCurrency(totalCents)}`,
        actor,
      );
    }

    let released = 0;
    let releasedCents = 0;
    for (const c of order.commissions) {
      if (c.status === 'PAGA') continue;
      const amountCents = computeCommission(totalCents, c.bps);
      const nextStatus = nextCommissionStatus(c.status, status, paymentStatus);
      if (amountCents === c.amountCents && c.baseCents === totalCents && nextStatus === c.status) continue;
      if (nextStatus === 'LIBERADA' && c.status !== 'LIBERADA') {
        released++;
        releasedCents += amountCents;
      }
      await tx.commission.update({
        where: { id: c.id },
        data: {
          baseCents: totalCents,
          amountCents,
          status: nextStatus,
          releasedAt: nextStatus === 'LIBERADA' ? (c.releasedAt ?? new Date()) : null,
        },
      });
    }
    if (released) {
      await logOrderEvent(tx, orderId, 'COMMISSION', `${released} comissão(ões) liberada(s) para pagamento · ${formatCurrency(releasedCents)}`, 'sistema');
    }

    return tx.order.update({ where: { id: orderId }, data: { totalCents, paidCents, paymentStatus, status } });
  });
}

/** Link público de acompanhamento: token aleatório, não adivinhável. */
export async function ensurePublicToken(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { publicToken: true } });
  if (order.publicToken) return order.publicToken;
  const token = crypto.randomBytes(18).toString('base64url');
  await prisma.order.update({ where: { id: orderId }, data: { publicToken: token } });
  return token;
}
