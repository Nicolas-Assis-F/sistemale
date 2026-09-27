'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import { ORDER_STATUS_ORDER, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { updateOrderStatus } from '@/app/admin/pedidos/_actions';
import { formatCurrency } from '@/lib/format';
import { toast } from '../toast';

export function OrderBoard({ orders }: { orders: { id: string; number: string; customer: string; status: OrderStatus; balance: number }[] }) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  function move(id: string, status: OrderStatus) {
    setDragged(null);
    if (pending || orders.find((o) => o.id === id)?.status === status) return;
    if (status === 'CANCELADO' && !window.confirm('Cancelar o pedido? Comissões não pagas serão canceladas.')) return;
    start(async () => {
      try { await updateOrderStatus(id, status); toast('Status atualizado'); router.refresh(); }
      catch { toast('Não foi possível alterar o status. Tente novamente.', 'error'); }
    });
  }
  return <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
    {ORDER_STATUS_ORDER.map((status) => {
      const column = orders.filter((o) => o.status === status);
      return <section key={status} aria-label={ORDER_STATUS_LABELS[status]} onDragOver={(e) => { if (dragged && !pending) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); if (dragged) move(dragged, status); }} className="rounded-2xl border border-le-line bg-le-subtle p-3">
        <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{ORDER_STATUS_LABELS[status]} <span className="rounded-full bg-le-surface px-2 py-1 text-xs">{column.length}</span></h2>
        <ul className="space-y-3">{column.map((order) => <li key={order.id} draggable={!pending} onDragStart={() => setDragged(order.id)} onDragEnd={() => setDragged(null)} className="rounded-xl border border-le-line bg-le-surface p-4">
          <Link href={`/admin/pedidos/${order.id}`} className="font-mono text-sm font-semibold text-le-blue">{order.number}</Link>
          <p className="mt-2 break-words text-sm">{order.customer}</p>
          <p className="mt-1 text-xs text-le-muted">A receber: <strong>{formatCurrency(order.balance)}</strong></p>
          <label className="mt-4 block text-[11px] text-le-muted">Mover pedido
            <select aria-label={`Status do pedido ${order.number}`} disabled={pending} value={order.status} onChange={(e) => move(order.id, e.target.value as OrderStatus)} className="mt-1 h-10 w-full rounded-lg border border-le-line bg-le-surface px-2 text-xs text-le-text">
              {ORDER_STATUS_ORDER.map((value) => <option key={value} value={value}>{ORDER_STATUS_LABELS[value]}</option>)}
            </select>
          </label>
        </li>)}</ul>
        {!column.length && <p className="py-8 text-center text-xs text-le-muted">Nenhum pedido nesta etapa.</p>}
      </section>;
    })}
  </div>;
}
