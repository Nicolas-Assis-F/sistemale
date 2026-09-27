// Rótulos e cores do financeiro — seguro para client components.
import type {
  CommissionRole, CommissionStatus, OrderPaymentStatus, PaymentMethod, PaymentStatus,
} from '@prisma/client';

export const ORDER_PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  NAO_COBRADO: 'Não cobrado',
  PENDENTE: 'Aguardando pagamento',
  PARCIAL: 'Pago parcialmente',
  PAGO: 'Pago',
  ESTORNADO: 'Estornado',
};

export const ORDER_PAYMENT_BADGE: Record<OrderPaymentStatus, string> = {
  NAO_COBRADO: 'bg-muted text-muted-foreground',
  PENDENTE: 'bg-amber-500/15 text-amber-700',
  PARCIAL: 'bg-blue-500/15 text-blue-700',
  PAGO: 'bg-emerald-500/15 text-emerald-700',
  ESTORNADO: 'bg-destructive/15 text-destructive',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  RECEBIDO: 'Recebido',
  VENCIDO: 'Vencido',
  ESTORNADO: 'Estornado',
  CANCELADO: 'Cancelado',
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  PENDENTE: 'bg-amber-500/15 text-amber-700',
  CONFIRMADO: 'bg-blue-500/15 text-blue-700',
  RECEBIDO: 'bg-emerald-500/15 text-emerald-700',
  VENCIDO: 'bg-destructive/15 text-destructive',
  ESTORNADO: 'bg-destructive/15 text-destructive',
  CANCELADO: 'bg-muted text-muted-foreground line-through',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CARTAO: 'Cartão de crédito',
  CLIENTE_ESCOLHE: 'Cliente escolhe (PIX, boleto ou cartão)',
  DINHEIRO: 'Dinheiro',
  TRANSFERENCIA: 'Transferência / TED',
  OUTRO: 'Outro',
};

/** Formas disponíveis para cobrança via Asaas vs. lançamento manual. */
export const ASAAS_METHODS: PaymentMethod[] = ['CLIENTE_ESCOLHE', 'PIX', 'BOLETO', 'CARTAO'];
export const MANUAL_METHODS: PaymentMethod[] = ['PIX', 'TRANSFERENCIA', 'DINHEIRO', 'BOLETO', 'CARTAO', 'OUTRO'];

export const COMMISSION_ROLE_LABELS: Record<CommissionRole, string> = {
  VENDA: 'Venda',
  PRODUCAO: 'Produção',
  INDICACAO: 'Indicação',
  OUTRO: 'Outro',
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDENTE: 'Aguardando pagamento do pedido',
  LIBERADA: 'A pagar',
  PAGA: 'Paga',
  CANCELADA: 'Cancelada',
};

export const COMMISSION_STATUS_BADGE: Record<CommissionStatus, string> = {
  PENDENTE: 'bg-muted text-muted-foreground',
  LIBERADA: 'bg-amber-500/15 text-amber-700',
  PAGA: 'bg-emerald-500/15 text-emerald-700',
  CANCELADA: 'bg-muted text-muted-foreground line-through',
};

/** 250 → "2,5%" */
export function formatBps(bps: number) {
  return `${(bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

/** "2,5" | "2.5" | "2,5%" → 250 (pontos-base). Inválido → null. */
export function parsePercentToBps(value: string): number | null {
  const n = Number(value.replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}
