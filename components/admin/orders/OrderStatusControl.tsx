'use client';

import { useOptimistic, useTransition } from 'react';
import type { OrderStatus } from '@prisma/client';
import { Check } from 'lucide-react';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { updateOrderStatus } from '@/app/admin/pedidos/_actions';
import { cn } from '@/lib/utils';
import { toast } from '../toast';

const FLOW: OrderStatus[] = ['ORCAMENTO', 'PEDIDO', 'EM_FABRICACAO', 'CONCLUIDO', 'ENTREGUE'];

/** Stepper clicável do fluxo do pedido + cancelar/reativar. */
export function OrderStatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [current, setCurrent] = useOptimistic(status);
  const [pending, start] = useTransition();
  const idx = FLOW.indexOf(current);

  function go(next: OrderStatus, confirmMsg?: string) {
    if (next === current || (confirmMsg && !window.confirm(confirmMsg))) return;
    start(async () => {
      setCurrent(next);
      try {
        await updateOrderStatus(orderId, next);
        toast(`Status: ${ORDER_STATUS_LABELS[next]}`);
      } catch { toast("Não foi possível atualizar o status.", "error"); }
    });
  }

  return (
    <div className={cn('rounded-2xl border border-le-line bg-white p-4', pending && 'opacity-80')}>
      <ol className="flex flex-wrap items-center gap-2">
        {FLOW.map((s, i) => {
          const done = current !== 'CANCELADO' && i < idx;
          const active = s === current;
          return (
            <li key={s} className="flex shrink-0 items-center">
              <button
                disabled={pending}
                aria-current={active ? "step" : undefined}
                onClick={() => go(s)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-medium transition-colors',
                  active ? 'bg-le-ink text-white' : done ? 'text-le-text hover:bg-le-subtle' : 'text-le-muted hover:bg-le-subtle hover:text-le-text',
                )}
              >
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', active ? 'bg-le-yellow text-le-ink' : done ? 'bg-emerald-500 text-white' : 'bg-le-subtle text-le-muted')}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{ORDER_STATUS_LABELS[s]}</span>
              </button>
              {i < FLOW.length - 1 && <span className={cn('mx-1 hidden h-px w-4 xl:block', done ? 'bg-emerald-400' : 'bg-le-line')} />}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex justify-end border-t border-le-line pt-3">
        {current === 'CANCELADO' ? (
          <button onClick={() => go('ORCAMENTO')} className="text-xs font-medium text-le-blue hover:underline">Reativar pedido (volta para Orçamento)</button>
        ) : (
          <button onClick={() => go('CANCELADO', 'Cancelar o pedido? Comissões não pagas serão canceladas.')} className="text-xs font-medium text-red-600 hover:underline">Cancelar pedido</button>
        )}
      </div>
    </div>
  );
}
