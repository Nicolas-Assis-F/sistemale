import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { ORDER_PAYMENT_BADGE, ORDER_PAYMENT_LABELS } from '@/lib/finance-labels';
import { cn } from '@/lib/utils';

/** Histórico comercial do cliente (server component) — usado no painel de edição. */
export async function CustomerHistory({ customerId }: { customerId: string }) {
  const [orders, user] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, number: true, status: true, paymentStatus: true, totalCents: true, paidCents: true, createdAt: true, source: true },
    }),
    prisma.user.findUnique({ where: { customerId }, select: { email: true, emailVerified: true, createdAt: true } }),
  ]);
  const valid = orders.filter((o) => o.status !== 'CANCELADO');
  const bought = valid.filter((o) => o.status !== 'ORCAMENTO').reduce((s, o) => s + o.totalCents, 0);
  const paid = valid.reduce((s, o) => s + o.paidCents, 0);
  const open = valid.filter((o) => o.status !== 'ORCAMENTO').reduce((s, o) => s + Math.max(0, o.totalCents - o.paidCents), 0);

  return (
    <section className="mt-8 border-t border-le-line pt-6">
      <h3 className="text-sm font-semibold">Histórico do cliente</h3>
      <p className="mt-1 text-xs text-le-muted">
        {user ? `Conta no portal: ${user.email} desde ${user.createdAt.toLocaleDateString('pt-BR')}` : 'Sem conta no portal — o cliente pode criar com o mesmo e-mail do cadastro.'}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ['Pedidos', String(orders.length)],
          ['Comprado', formatCurrency(bought)],
          ['Pago', formatCurrency(paid)],
          ['Em aberto', formatCurrency(open)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-le-subtle px-3 py-2">
            <dt className="text-le-muted">{l}</dt>
            <dd className={cn('mt-0.5 font-semibold tabular-nums', l === 'Em aberto' && open > 0 && 'text-le-warning')}>{v}</dd>
          </div>
        ))}
      </dl>
      {orders.length > 0 ? (
        <ul className="mt-4 divide-y divide-le-line rounded-xl border border-le-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-xs hover:bg-le-subtle">
                <span className="font-mono font-semibold">{o.number}</span>
                <span className={cn('rounded-full px-2 py-0.5 font-semibold', ORDER_STATUS_BADGE[o.status])}>{ORDER_STATUS_LABELS[o.status]}</span>
                <span className={cn('rounded-full px-2 py-0.5 font-semibold', ORDER_PAYMENT_BADGE[o.paymentStatus])}>{ORDER_PAYMENT_LABELS[o.paymentStatus]}</span>
                {o.source === 'SITE' && <span className="rounded-full bg-le-tint px-2 py-0.5 font-semibold text-le-blue">site</span>}
                <span className="ml-auto tabular-nums">{o.totalCents ? formatCurrency(o.totalCents) : 'em cotação'}</span>
                <span className="w-full text-le-muted sm:w-auto">{o.createdAt.toLocaleDateString('pt-BR')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-le-muted">Nenhum pedido ainda.</p>
      )}
    </section>
  );
}
