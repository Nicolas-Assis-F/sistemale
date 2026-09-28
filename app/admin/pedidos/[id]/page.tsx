import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ArrowLeft, Factory, FileText, History, Pencil } from 'lucide-react';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from '@/lib/order-status';
import { ORDER_PAYMENT_BADGE, ORDER_PAYMENT_LABELS } from '@/lib/finance-labels';
import { asaasConfigured, asaasEnv } from '@/lib/asaas';
import { formatTaxId, isValidTaxId } from '@/lib/domains/customers/tax-id';
import { customerFiscalReadiness, principalAddressInclude } from '@/lib/domains/customers/fiscal-profile';
import { FiscalReadinessPanel } from '@/components/admin/FiscalReadinessPanel';
import { FinancePanel } from '@/components/admin/orders/FinancePanel';
import { CommissionPanel } from '@/components/admin/orders/CommissionPanel';
import { CustomerLinkCard } from '@/components/admin/orders/CustomerLinkCard';
import { OrderStatusControl } from '@/components/admin/orders/OrderStatusControl';
import { DeleteOrderButton } from '@/components/admin/orders/DeleteOrderButton';

const ACTOR_LABEL: Record<string, string> = { admin: 'Painel', asaas: 'Asaas', cliente: 'Cliente', sistema: 'Automático' };
const EVENT_DOT: Record<string, string> = {
  CREATED: 'bg-le-blue', STATUS: 'bg-le-ink', PAYMENT: 'bg-emerald-500', COMMISSION: 'bg-le-yellow', UPDATED: 'bg-[#b4b8d4]',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, employees] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: { include: principalAddressInclude },
        employee: { select: { name: true } },
        items: { orderBy: { position: 'asc' } },
        payments: { orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }] },
        commissions: { include: { employee: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, commissionBps: true } }),
  ]);
  if (!order) notFound();

  // Pedidos antigos (antes do ledger) ainda sem snapshot: calcula na hora
  const total = order.totalCents || order.items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  const h = await headers();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`).replace(/\/$/, '');
  const cancelled = order.status === 'CANCELADO';

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/pedidos" className="inline-flex items-center gap-1.5 text-xs text-le-muted hover:text-le-blue">
            <ArrowLeft className="h-3.5 w-3.5" /> Pedidos
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{order.number}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ORDER_STATUS_BADGE[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ORDER_PAYMENT_BADGE[order.paymentStatus]}`}>{ORDER_PAYMENT_LABELS[order.paymentStatus]}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customer.name} · criado em {order.createdAt.toLocaleDateString('pt-BR')}
            {order.employee?.name && ` · responsável: ${order.employee.name}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/pedidos/${order.id}/pdf?tipo=comercial`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}>
            <FileText className="h-4 w-4" /> PDF comercial
          </a>
          <a href={`/api/pedidos/${order.id}/pdf?tipo=fabricacao`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}>
            <Factory className="h-4 w-4" /> Ordem de fabricação
          </a>
          <Link href={`/admin/pedidos/${order.id}/editar`} className={buttonVariants({ size: 'sm' }) + ' gap-1.5'}>
            <Pencil className="h-4 w-4" /> Editar
          </Link>
        </div>
      </div>

      <OrderStatusControl orderId={order.id} status={order.status} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-le-line bg-white">
            <Table className="le-responsive-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Designação</TableHead>
                  <TableHead className="text-right">ICMS</TableHead>
                  <TableHead className="text-right">Preço unit.</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="pr-5 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell data-label="Designação" className="pl-5">
                      <p className="font-medium">{it.name}</p>
                      {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
                    </TableCell>
                    <TableCell data-label="ICMS" className="text-right text-sm">{it.icmsPercent}%</TableCell>
                    <TableCell data-label="Preço unit." className="text-right text-sm">{formatCurrency(it.unitPriceCents)}</TableCell>
                    <TableCell data-label="Qtd." className="text-right text-sm">{it.quantity}</TableCell>
                    <TableCell data-label="Total" className="pr-5 text-right text-sm font-medium">{formatCurrency(it.quantity * it.unitPriceCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-le-line bg-le-subtle px-5 py-3">
              <span className="text-sm font-semibold">Total do pedido</span>
              <span className="font-heading text-xl font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-le-line bg-white p-5">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-le-muted">Cliente</h2>
              <p className="font-semibold">{order.customer.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{order.customer.code}</p>
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {order.customer.doc ? <p>CPF/CNPJ: {formatTaxId(order.customer.doc)}</p> : <p className="text-amber-700">Sem CPF/CNPJ — necessário para cobrar no Asaas</p>}
                {order.customer.contact && <p>Contato: {order.customer.contact}</p>}
                {order.customer.phone && <p>{order.customer.phone}</p>}
                {order.customer.email && <p>{order.customer.email}</p>}
                {(order.customer.city || order.customer.state) && <p>{[order.customer.city, order.customer.state].filter(Boolean).join(' – ')} {order.customer.zip}</p>}
              </div>
              <div className="mt-3"><FiscalReadinessPanel readiness={customerFiscalReadiness(order.customer)} compact /></div>
              <Link href={`/admin/clientes/${order.customer.id}`} className="mt-3 inline-block text-xs font-medium text-le-blue hover:underline">Editar cadastro</Link>
            </div>
            <div className="rounded-2xl border border-le-line bg-white p-5">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-le-muted">Condições</h2>
              <dl className="space-y-1.5 text-sm">
                {order.clientRef && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Ref. cliente</dt><dd>{order.clientRef}</dd></div>}
                {order.deliveryDate && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Entrega prevista</dt><dd>{order.deliveryDate.toLocaleDateString('pt-BR')}</dd></div>}
                {order.paymentTerms && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Condição</dt><dd>{order.paymentTerms}</dd></div>}
                {order.paymentMethod && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Forma</dt><dd>{order.paymentMethod}</dd></div>}
              </dl>
              {order.notes && <p className="mt-3 border-t border-le-line pt-3 text-sm text-muted-foreground">{order.notes}</p>}
            </div>
          </div>

          {/* Linha do tempo */}
          <section className="rounded-2xl border border-le-line bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-le-blue" /> Linha do tempo</h2>
            {order.events.length === 0 ? (
              <p className="text-xs text-le-muted">O histórico começa a ser registrado a partir da próxima alteração.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-le-line pl-5">
                {order.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${EVENT_DOT[e.type] ?? 'bg-[#b4b8d4]'}`} />
                    <p className="text-sm text-le-text">{e.message}</p>
                    <p className="mt-0.5 text-[11px] text-le-muted">
                      {e.createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {ACTOR_LABEL[e.actor] ?? e.actor}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <DeleteOrderButton id={order.id} number={order.number} />
        </div>

        {/* Coluna de controle */}
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6">
          <FinancePanel
            orderId={order.id}
            orderCancelled={cancelled}
            totalCents={total}
            paidCents={order.paidCents}
            paymentStatus={order.paymentStatus}
            asaas={{ enabled: asaasConfigured(), env: asaasEnv() }}
            customerDocOk={!!order.customer.doc && isValidTaxId(order.customer.doc)}
            payments={order.payments.map((p) => ({
              id: p.id, provider: p.provider, method: p.method, status: p.status, amountCents: p.amountCents, netCents: p.netCents,
              dueDate: p.dueDate?.toISOString() ?? null, paidAt: p.paidAt?.toISOString() ?? null,
              invoiceUrl: p.invoiceUrl, bankSlipUrl: p.bankSlipUrl, pixPayload: p.pixPayload, pixQrImage: p.pixQrImage,
              installmentCount: p.installmentCount, planLabel: p.planLabel, finePercent: p.finePercent, interestPercent: p.interestPercent, createdAt: p.createdAt.toISOString(),
            }))}
          />
          <CommissionPanel
            orderId={order.id}
            orderCancelled={cancelled}
            totalCents={total}
            employees={employees}
            commissions={order.commissions.map((c) => ({
              id: c.id, employeeName: c.employee.name, role: c.role, bps: c.bps, amountCents: c.amountCents, status: c.status,
            }))}
          />
          <CustomerLinkCard
            orderId={order.id}
            orderNumber={order.number}
            token={order.publicToken}
            siteUrl={siteUrl}
            customerPhone={order.customer.phone}
          />
        </aside>
      </div>
    </div>
  );
}
