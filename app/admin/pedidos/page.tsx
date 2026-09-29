import Link from 'next/link';
import type { OrderStatus, OrderPaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminRecords } from '@/components/admin/AdminRecords';
import { OrderBoard } from '@/components/admin/orders/OrderBoard';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_ORDER, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from '@/lib/order-status';
import { ORDER_PAYMENT_BADGE, ORDER_PAYMENT_LABELS } from '@/lib/finance-labels';
import { requireAdmin } from '@/lib/auth';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string; visual?: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { q = '', status, paymentStatus, visual } = await searchParams;
  const where: Prisma.OrderWhereInput = {
    ...(ORDER_STATUS_ORDER.includes(status as OrderStatus) ? { status: status as OrderStatus } : {}),
    ...(paymentStatus && Object.hasOwn(ORDER_PAYMENT_LABELS, paymentStatus) ? { paymentStatus: paymentStatus as OrderPaymentStatus } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: 'insensitive' } }, { customer: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
  };
  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } }, employee: { select: { name: true } }, items: { select: { quantity: true, unitPriceCents: true } } } });
  const total = (order: typeof orders[number]) => order.totalCents || order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const balance = (o: typeof orders[number]) => Math.max(0, total(o) - o.paidCents);
  return <div className="le-admin-page">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="le-kicker">Vendas / Produção</p><h1 className="le-admin-title">Pedidos e orçamentos</h1><p className="mt-2 text-sm text-le-muted">{orders.length} pedido(s) encontrados</p></div>
      <Link href="/admin/pedidos/novo" className={buttonVariants()}>+ Novo pedido</Link>
    </div>
    <AdminFilters placeholder="Buscar por número ou cliente" filters={[
      { name: 'status', label: 'Status do pedido', options: [{ value: '', label: 'Todos os status' }, ...ORDER_STATUS_ORDER.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }))] },
      { name: 'paymentStatus', label: 'Situação financeira', options: [{ value: '', label: 'Todas as situações' }, ...Object.entries(ORDER_PAYMENT_LABELS).map(([value, label]) => ({ value, label }))] },
      { name: 'visual', label: 'Visualização', options: [{ value: '', label: 'Lista' }, { value: 'quadro', label: 'Quadro por status' }] },
    ]} />
    {visual === 'quadro' && orders.length ? <OrderBoard orders={orders.map((o) => ({ id: o.id, number: o.number, customer: o.customer.name, status: o.status, balance: balance(o) }))} /> :
      <AdminRecords createHref="/admin/pedidos/novo" createLabel="Criar orçamento" empty="Nenhum pedido encontrado. Ajuste os filtros ou crie um orçamento." rows={orders.map((o) => ({
        id: o.id,
        title: <><Link href={`/admin/pedidos/${o.id}`} className="font-mono text-sm font-semibold text-le-blue">{o.number}</Link>{o.source === 'SITE' && <span className="ml-2 rounded-full bg-le-tint px-2 py-0.5 text-[11px] font-semibold text-le-blue">Pelo site</span>}<p className="mt-1 text-sm">{o.customer.name}</p><p className="mt-1 text-xs text-le-muted">{o.createdAt.toLocaleDateString('pt-BR')} · {o.employee?.name ?? 'Sem responsável'}</p></>,
        details: [
          { label: 'Status', value: <span className={`inline-block rounded-full px-2.5 py-1 text-xs ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span> },
          { label: 'Financeiro', value: <span className={`inline-block rounded-full px-2.5 py-1 text-xs ${ORDER_PAYMENT_BADGE[o.paymentStatus]}`}>{ORDER_PAYMENT_LABELS[o.paymentStatus]}</span> },
          { label: 'Total', value: formatCurrency(total(o)) },
          { label: 'A receber', value: <strong className="tabular-nums">{formatCurrency(balance(o))}</strong> },
        ],
        actions: <Link href={`/admin/pedidos/${o.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Abrir pedido</Link>,
      }))} />}
  </div>;
}
