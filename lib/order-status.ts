import type { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ORCAMENTO: 'Orçamento',
  PEDIDO: 'Pedido',
  EM_FABRICACAO: 'Em fabricação',
  CONCLUIDO: 'Concluído',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

/** Classes Tailwind para o badge de cada status. */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  ORCAMENTO: 'bg-muted text-muted-foreground',
  PEDIDO: 'bg-blue-500/15 text-blue-600',
  EM_FABRICACAO: 'bg-amber-500/15 text-amber-600',
  CONCLUIDO: 'bg-emerald-500/15 text-emerald-600',
  ENTREGUE: 'bg-emerald-700/15 text-emerald-700',
  CANCELADO: 'bg-destructive/15 text-destructive',
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'ORCAMENTO',
  'PEDIDO',
  'EM_FABRICACAO',
  'CONCLUIDO',
  'ENTREGUE',
  'CANCELADO',
];
