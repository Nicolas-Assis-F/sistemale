import Link from 'next/link';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { ORDER_STATUS_ORDER, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from '@/lib/order-status';

function orderTotal(items: { quantity: number; unitPriceCents: number }[]) {
  return items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const activeStatus = ORDER_STATUS_ORDER.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const where: Prisma.OrderWhereInput = activeStatus ? { status: activeStatus } : {};

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      employee: { select: { name: true } },
      items: { select: { quantity: true, unitPriceCents: true } },
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos / Orçamentos</h1>
          <p className="text-sm text-muted-foreground">{orders.length} {activeStatus ? `· ${ORDER_STATUS_LABELS[activeStatus]}` : 'no total'}</p>
        </div>
        <Link href="/admin/pedidos/novo" className={buttonVariants()}>+ Novo Pedido</Link>
      </div>

      {/* Filtro por status */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/pedidos"
          className={buttonVariants({ variant: activeStatus ? 'outline' : 'default', size: 'sm' })}
        >
          Todos
        </Link>
        {ORDER_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/admin/pedidos?status=${s}`}
            className={buttonVariants({ variant: activeStatus === s ? 'default' : 'outline', size: 'sm' })}
          >
            {ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Total</TableHead>
              <TableHead className="text-right">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} className="cursor-pointer">
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-semibold hover:text-primary">{o.number}</Link>
                </TableCell>
                <TableCell className="font-medium">{o.customer.name}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{o.employee?.name ?? '—'}</TableCell>
                <TableCell>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status]}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </TableCell>
                <TableCell className="hidden text-right text-sm sm:table-cell">{formatCurrency(orderTotal(o.items))}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{o.createdAt.toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum pedido encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
