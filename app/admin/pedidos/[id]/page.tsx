import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, Factory, Pencil, Trash2 } from 'lucide-react';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_ORDER, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from '@/lib/order-status';
import { updateOrderStatus, deleteOrder } from '../_actions';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      employee: { select: { name: true } },
      items: { orderBy: { position: 'asc' } },
    },
  });
  if (!order) notFound();

  const total = order.items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/pedidos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>← Voltar</Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold">{order.number}</h1>
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Criado em {order.createdAt.toLocaleDateString('pt-BR')}
              {order.employee?.name && ` · Responsável: ${order.employee.name}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/pedidos/${order.id}/pdf?tipo=comercial`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}>
            <FileText className="h-4 w-4" /> PDF Comercial
          </a>
          <a href={`/api/pedidos/${order.id}/pdf?tipo=fabricacao`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}>
            <Factory className="h-4 w-4" /> Ordem de Fabricação
          </a>
          <Link href={`/admin/pedidos/${order.id}/editar`} className={buttonVariants({ size: 'sm' }) + ' gap-1.5'}>
            <Pencil className="h-4 w-4" /> Editar
          </Link>
        </div>
      </div>

      {/* Workflow de status */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alterar status</p>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_ORDER.map((s) => (
            <form key={s} action={async () => { 'use server'; await updateOrderStatus(order.id, s); }}>
              <button
                type="submit"
                disabled={s === order.status}
                className={buttonVariants({ variant: s === order.status ? 'default' : 'outline', size: 'sm' }) + (s === order.status ? ' pointer-events-none' : '')}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* De / Para */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h2>
          <p className="font-semibold">{order.customer.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{order.customer.code}</p>
          <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            {order.customer.doc && <p>CNPJ/CPF: {order.customer.doc}</p>}
            {order.customer.contact && <p>Contato: {order.customer.contact}</p>}
            {order.customer.phone && <p>{order.customer.phone}</p>}
            {order.customer.address && <p>{order.customer.address}</p>}
            {(order.customer.city || order.customer.state) && <p>{[order.customer.city, order.customer.state].filter(Boolean).join(' – ')} {order.customer.zip}</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalhes</h2>
          <dl className="space-y-1.5 text-sm">
            {order.clientRef && <div className="flex justify-between"><dt className="text-muted-foreground">Ref. cliente</dt><dd>{order.clientRef}</dd></div>}
            {order.deliveryDate && <div className="flex justify-between"><dt className="text-muted-foreground">Entrega prevista</dt><dd>{order.deliveryDate.toLocaleDateString('pt-BR')}</dd></div>}
            {order.paymentTerms && <div className="flex justify-between"><dt className="text-muted-foreground">Pagamento</dt><dd>{order.paymentTerms}</dd></div>}
            {order.paymentMethod && <div className="flex justify-between"><dt className="text-muted-foreground">Forma</dt><dd>{order.paymentMethod}</dd></div>}
          </dl>
          {order.notes && <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{order.notes}</p>}
        </div>
      </div>

      {/* Itens */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Designação</TableHead>
              <TableHead className="text-right">ICMS</TableHead>
              <TableHead className="text-right">Preço Unit.</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <p className="font-medium">{it.name}</p>
                  {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
                </TableCell>
                <TableCell className="text-right text-sm">{it.icmsPercent}%</TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(it.unitPriceCents)}</TableCell>
                <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                <TableCell className="text-right text-sm font-medium">{formatCurrency(it.quantity * it.unitPriceCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Excluir */}
      <form action={async () => { 'use server'; await deleteOrder(order.id); }}>
        <button type="submit" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' gap-2 text-destructive hover:text-destructive'}>
          <Trash2 className="h-4 w-4" /> Excluir pedido
        </button>
      </form>
    </div>
  );
}
