import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { OrderView, ORDER_VIEW_SELECT } from '@/components/public/OrderView';
import { PaymentWatcher } from '@/components/account/PaymentWatcher';
import { syncOrderPaymentsQuick } from '@/lib/orders/asaas-reconcile';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Acompanhe seu pedido', robots: { index: false, follow: false } };

/** Página pública do pedido (acesso por token aleatório, sem login). */
export default async function PublicOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const ref = await prisma.order.findUnique({ where: { publicToken: token }, select: { id: true } });
  if (!ref) notFound();
  await syncOrderPaymentsQuick(ref.id);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: ref.id }, select: ORDER_VIEW_SELECT });
  const awaitingPayment = order.paymentStatus !== 'PAGO' && order.status !== 'CANCELADO'
    && order.payments.some((p) => p.status === 'PENDENTE' || p.status === 'VENCIDO');
  return (
    <>
      <div className="le-container max-w-4xl pt-6"><PaymentWatcher active={awaitingPayment} /></div>
      <OrderView order={order} />
    </>
  );
}
