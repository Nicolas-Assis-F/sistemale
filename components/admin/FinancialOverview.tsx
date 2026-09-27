import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { PAID_STATUSES } from '@/lib/orders/ledger';

export async function FinancialOverview() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00-03:00`);
  const dayStart = new Date(`${today}T00:00:00-03:00`);
  const overdueWhere = { order: { status: { not: 'CANCELADO' as const } }, OR: [{ status: 'VENCIDO' as const }, { status: 'PENDENTE' as const, dueDate: { lt: dayStart } }] };
  const [orders, received, overdue, commissions, late, missingDocs, released, siteQuotes] = await Promise.all([
    prisma.order.findMany({ where: { status: { notIn: ['ORCAMENTO', 'CANCELADO'] } }, select: { totalCents: true, paidCents: true } }),
    prisma.payment.aggregate({ where: { status: { in: PAID_STATUSES }, paidAt: { gte: monthStart, lte: new Date() } }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({ where: overdueWhere, _sum: { amountCents: true }, _count: true }),
    prisma.commission.aggregate({ where: { status: 'LIBERADA' }, _sum: { amountCents: true }, _count: true }),
    prisma.payment.findMany({ where: overdueWhere, orderBy: { dueDate: 'asc' }, take: 5, select: { id: true, amountCents: true, order: { select: { id: true, number: true } } } }),
    prisma.order.findMany({ where: { status: { not: 'CANCELADO' }, customer: { OR: [{ doc: null }, { doc: '' }] }, payments: { some: { status: { in: ['PENDENTE', 'VENCIDO'] } } } }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, number: true, customerId: true } }),
    prisma.commission.findMany({ where: { status: 'LIBERADA' }, take: 5, orderBy: { releasedAt: 'asc' }, select: { id: true, amountCents: true, employee: { select: { name: true } } } }),
    // Orçamentos pedidos pelo cliente no site e ainda sem preço
    prisma.order.findMany({ where: { source: 'SITE', status: 'ORCAMENTO', totalCents: 0 }, take: 5, orderBy: { createdAt: 'asc' }, select: { id: true, number: true, createdAt: true, customer: { select: { name: true } } } }),
  ]);
  const metrics = [
    { label: 'A receber', value: orders.reduce((sum, order) => sum + Math.max(0, order.totalCents - order.paidCents), 0), detail: 'Pedidos confirmados, sem cancelados', href: '/admin/pedidos' },
    { label: 'Recebido no mês', value: received._sum.amountCents ?? 0, detail: 'Bruto confirmado/recebido · horário de Brasília', href: '/admin/pedidos?paymentStatus=PAGO' },
    { label: 'Cobranças vencidas', value: overdue._sum.amountCents ?? 0, detail: `${overdue._count} cobrança(s) em aberto`, href: '#precisa-de-atencao' },
    { label: 'Comissões a pagar', value: commissions._sum.amountCents ?? 0, detail: `${commissions._count} comissão(ões) liberada(s)`, href: '/admin/comissoes?aba=apagar' },
  ];
  const attention = [
    ...siteQuotes.map((order) => ({ key: order.id, text: `${order.number} · orçamento pedido pelo site (${order.customer.name})`, detail: `aguardando desde ${order.createdAt.toLocaleDateString('pt-BR')}`, href: `/admin/pedidos/${order.id}` })),
    ...late.map((payment) => ({ key: payment.id, text: `${payment.order.number} · cobrança vencida`, detail: formatCurrency(payment.amountCents), href: `/admin/pedidos/${payment.order.id}` })),
    ...missingDocs.map((order) => ({ key: order.id, text: `${order.number} · documento do cliente ausente`, detail: 'Cobrança pendente · completar cadastro', href: `/admin/clientes?editar=${order.customerId}` })),
    ...released.map((commission) => ({ key: commission.id, text: `${commission.employee.name} · comissão liberada`, detail: formatCurrency(commission.amountCents), href: '/admin/comissoes?aba=apagar' })),
  ];
  return <>
    <section aria-label="Resumo financeiro" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <Link key={metric.label} href={metric.href} className="rounded-2xl border border-le-line bg-le-surface p-5 hover:border-le-blue">
        <h2 className="text-xs font-medium text-le-muted">{metric.label}</h2><p className="mt-3 font-heading text-2xl font-medium tracking-tight tabular-nums">{formatCurrency(metric.value)}</p><p className="mt-2 text-[11px] text-le-muted">{metric.detail}</p>
      </Link>)}
    </section>
    <section id="precisa-de-atencao" className="rounded-2xl border border-le-line bg-le-surface p-5 sm:p-7">
      <h2 className="font-heading text-lg font-medium">Precisa de atenção</h2>
      {attention.length ? <><p className="mt-1 text-xs text-le-muted">Até cinco ocorrências de cada tipo, com acesso direto para resolver.</p><ul className="mt-4 divide-y divide-le-line">{attention.map((item) => <li key={item.key}><Link href={item.href} className="flex flex-wrap items-center justify-between gap-2 rounded-lg py-3 text-sm hover:text-le-blue"><span>{item.text}</span><span className="text-xs text-le-muted">{item.detail} →</span></Link></li>)}</ul></> : <p className="mt-4 text-sm text-le-muted">Tudo em dia. Nenhuma pendência encontrada.</p>}
    </section>
  </>;
}
