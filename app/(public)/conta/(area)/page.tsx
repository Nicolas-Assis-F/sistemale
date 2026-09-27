import Link from 'next/link';
import { ArrowUpRight, PackageSearch, UserRoundPen } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireCustomer } from '@/lib/customer-session';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { ORDER_PAYMENT_BADGE, ORDER_PAYMENT_LABELS } from '@/lib/finance-labels';
import { cn } from '@/lib/utils';

export default async function AccountOrdersPage() {
  const { customer } = await requireCustomer('/conta');
  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
    select: {
      number: true, status: true, paymentStatus: true, totalCents: true, paidCents: true, createdAt: true,
      items: { select: { name: true, quantity: true }, orderBy: { position: 'asc' }, take: 2 },
      _count: { select: { items: true } },
      payments: { where: { status: { in: ['PENDENTE', 'VENCIDO'] } }, select: { id: true }, take: 1 },
    },
  });
  const profileIncomplete = !customer.doc || !customer.phone;

  return (
    <div className="space-y-6">
      {profileIncomplete && (
        <Link href="/conta/dados" className="group flex items-center gap-4 rounded-2xl border border-le-warning/30 bg-le-warning-surface p-5 transition-colors hover:border-le-warning/60">
          <UserRoundPen className="h-6 w-6 shrink-0 text-le-warning" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-le-text">Complete seu cadastro</p>
            <p className="text-sm text-le-muted">CPF/CNPJ e telefone são necessários para emitir cobranças e agilizar seus orçamentos.</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-le-warning transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-le-line bg-white p-12 text-center">
          <PackageSearch className="mx-auto h-9 w-9 text-le-muted" />
          <h2 className="mt-5 font-heading text-xl">Nenhum pedido por aqui ainda.</h2>
          <p className="mt-2 text-sm text-le-muted">Escolha um equipamento na vitrine e clique em “Solicitar orçamento”.</p>
          <Link href="/vitrine" className="le-button le-button-blue mt-6">Ir para a vitrine <ArrowUpRight size={16} /></Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => {
            const summary = o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') + (o._count.items > 2 ? ` e mais ${o._count.items - 2}` : '');
            return (
              <li key={o.number}>
                <Link href={`/conta/pedidos/${o.number}`} className="group flex flex-col gap-3 rounded-2xl border border-le-line bg-white p-5 transition-[border-color,box-shadow] hover:border-le-blue-border hover:shadow-[0_18px_40px_-24px_rgb(28_42_143/0.35)] sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.number}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ORDER_STATUS_BADGE[o.status])}>{ORDER_STATUS_LABELS[o.status]}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', ORDER_PAYMENT_BADGE[o.paymentStatus])}>{ORDER_PAYMENT_LABELS[o.paymentStatus]}</span>
                      {o.payments.length > 0 && <span className="rounded-full bg-le-blue px-2 py-0.5 text-[11px] font-semibold text-white">Pagamento disponível</span>}
                    </div>
                    <p className="mt-1.5 truncate text-sm text-le-muted">{summary}</p>
                  </div>
                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-right">
                      <p className="font-semibold">{o.totalCents > 0 ? formatCurrency(o.totalCents) : 'Em cotação'}</p>
                      <p className="text-xs text-le-muted">{o.createdAt.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-le-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-le-blue" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
