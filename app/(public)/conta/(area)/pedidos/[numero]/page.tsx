import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, PartyPopper, QrCode } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireCustomer } from '@/lib/customer-session';
import { OrderView, ORDER_VIEW_SELECT } from '@/components/public/OrderView';
import { PaymentWatcher } from '@/components/account/PaymentWatcher';
import { syncOrderPaymentsQuick } from '@/lib/orders/asaas-reconcile';

export default async function AccountOrderPage({ params, searchParams }: { params: Promise<{ numero: string }>; searchParams: Promise<{ novo?: string; pagar?: string }> }) {
  const [{ numero }, { novo, pagar }] = await Promise.all([params, searchParams]);
  const { customer } = await requireCustomer(`/conta/pedidos/${numero}`);
  // Escopo pelo cliente logado: número de outro cliente = 404
  const ref = await prisma.order.findFirst({ where: { number: numero, customerId: customer.id }, select: { id: true } });
  if (!ref) notFound();
  // Enquanto o cliente espera, confere direto no Asaas (não depende só do webhook)
  await syncOrderPaymentsQuick(ref.id);
  const order = await prisma.order.findUnique({ where: { id: ref.id }, select: ORDER_VIEW_SELECT });
  if (!order) notFound();
  const awaitingPayment = order.paymentStatus !== 'PAGO' && order.status !== 'CANCELADO'
    && order.payments.some((p) => p.status === 'PENDENTE' || p.status === 'VENCIDO');

  return (
    <div className="[&_.le-public-order]:mx-0 [&_.le-public-order]:w-full [&_.le-public-order]:max-w-4xl [&_.le-public-order]:py-0">
      {pagar && awaitingPayment && (
        <div className="mb-4 flex max-w-4xl items-center gap-3 rounded-2xl border border-le-blue/25 bg-le-tint p-4 text-sm text-le-text">
          <QrCode className="h-5 w-5 shrink-0 text-le-blue" />
          Pedido criado! Pague abaixo pelo PIX (QR Code ou copia e cola) ou pela fatura. A confirmação aparece aqui automaticamente.
        </div>
      )}
      <PaymentWatcher active={awaitingPayment} />
      {novo && (
        <div className="mb-6 flex max-w-4xl items-center gap-3 rounded-2xl border border-le-success/25 bg-le-success-surface p-4 text-sm text-le-text">
          <PartyPopper className="h-5 w-5 shrink-0 text-le-success" />
          Solicitação recebida! Nossa engenharia vai preparar o orçamento e você será avisado por e-mail.
        </div>
      )}
      <OrderView
        order={order}
        backLink={
          <Link href="/conta" className="mb-5 inline-flex items-center gap-1.5 text-xs text-le-muted hover:text-le-blue">
            <ArrowLeft className="h-3.5 w-3.5" /> Meus pedidos
          </Link>
        }
      />
    </div>
  );
}
