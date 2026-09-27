import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireCustomer } from '@/lib/customer-session';
import { OrderView, ORDER_VIEW_SELECT } from '@/components/public/OrderView';

export default async function AccountOrderPage({ params, searchParams }: { params: Promise<{ numero: string }>; searchParams: Promise<{ novo?: string }> }) {
  const [{ numero }, { novo }] = await Promise.all([params, searchParams]);
  const { customer } = await requireCustomer(`/conta/pedidos/${numero}`);
  // Escopo pelo cliente logado: número de outro cliente = 404
  const order = await prisma.order.findFirst({ where: { number: numero, customerId: customer.id }, select: ORDER_VIEW_SELECT });
  if (!order) notFound();

  return (
    <div className="[&_.le-public-order]:mx-0 [&_.le-public-order]:w-full [&_.le-public-order]:max-w-4xl [&_.le-public-order]:py-0">
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
