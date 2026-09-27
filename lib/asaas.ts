// Cliente mínimo da API v3 do Asaas (server-only).
// Docs: https://docs.asaas.com — auth pelo header `access_token`; User-Agent é
// obrigatório para contas criadas a partir de 11/06/2024.
import type { PaymentMethod, PaymentStatus } from '@prisma/client';

const BASE_URL = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
} as const;

/**
 * Ambiente pela URL configurada (ASAAS_API_URL) — ou ASAAS_ENV como alternativa.
 * Padrão seguro: sandbox.
 */
export function asaasEnv(): keyof typeof BASE_URL {
  const url = process.env.ASAAS_API_URL;
  if (url) return url.includes('sandbox') ? 'sandbox' : 'production';
  return process.env.ASAAS_ENV === 'production' ? 'production' : 'sandbox';
}

function asaasBaseUrl() {
  return (process.env.ASAAS_API_URL || BASE_URL[asaasEnv()]).replace(/\/$/, '');
}

/** Chave do ambiente ativo: no sandbox usa ASAAS_API_KEY_SANDBOX (se houver). */
function asaasKey() {
  return asaasEnv() === 'sandbox'
    ? process.env.ASAAS_API_KEY_SANDBOX || process.env.ASAAS_API_KEY
    : process.env.ASAAS_API_KEY;
}

/** Diagnóstico da configuração — a chave precisa ser do mesmo ambiente da URL. */
export function asaasConfigIssue(): string | null {
  const key = asaasKey();
  if (!key) return 'ASAAS_API_KEY não configurada';
  const env = asaasEnv();
  if (env === 'sandbox' && key.startsWith('$aact_prod_')) return 'Chave de PRODUÇÃO com URL de sandbox';
  if (env === 'production' && key.startsWith('$aact_hmlg_')) return 'Chave de SANDBOX com URL de produção';
  return null;
}

/** Integração ativa só com chave coerente — sem ela o painel usa apenas lançamentos manuais. */
export function asaasConfigured() {
  return asaasConfigIssue() === null;
}

export class AsaasError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

async function asaasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const issue = asaasConfigIssue();
  if (issue) throw new AsaasError(`Asaas não configurado: ${issue}.`, 0);
  const key = asaasKey()!;
  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'letorneadora-admin',
      access_token: key,
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Formato de erro do Asaas: { errors: [{ code, description }] }
    const description =
      (body as { errors?: { description?: string }[] } | null)?.errors?.map((e) => e.description).filter(Boolean).join(' · ') ||
      `Erro ${res.status} na API do Asaas`;
    throw new AsaasError(description, res.status, body);
  }
  return body as T;
}

// ─── Tipos (apenas os campos usados) ───────────────────────────────────────────

export type AsaasBillingType = 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX';

export interface AsaasPayment {
  id: string;
  customer: string;
  status: string;
  billingType: AsaasBillingType;
  value: number;
  netValue?: number;
  dueDate: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  invoiceUrl?: string;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
  installment?: string | null;
  deleted?: boolean;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}

// ─── Mapeamentos ───────────────────────────────────────────────────────────────

export const METHOD_TO_BILLING: Partial<Record<PaymentMethod, AsaasBillingType>> = {
  CLIENTE_ESCOLHE: 'UNDEFINED',
  PIX: 'PIX',
  BOLETO: 'BOLETO',
  CARTAO: 'CREDIT_CARD',
};

export function billingToMethod(b: AsaasBillingType): PaymentMethod {
  return b === 'PIX' ? 'PIX' : b === 'BOLETO' ? 'BOLETO' : b === 'CREDIT_CARD' ? 'CARTAO' : 'CLIENTE_ESCOLHE';
}

/** Status do Asaas → status interno. */
export function mapAsaasStatus(status: string, deleted?: boolean): PaymentStatus {
  if (deleted) return 'CANCELADO';
  switch (status) {
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
    case 'DUNNING_RECEIVED':
      return 'RECEBIDO';
    case 'CONFIRMED':
      return 'CONFIRMADO';
    case 'OVERDUE':
      return 'VENCIDO';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'ESTORNADO';
    default:
      return 'PENDENTE'; // PENDING, AWAITING_RISK_ANALYSIS, DUNNING_REQUESTED…
  }
}

export const toCents = (reais: number) => Math.round(reais * 100);
const toReais = (cents: number) => Math.round(cents) / 100;

export function paidAtFrom(p: AsaasPayment): Date | null {
  const d = p.clientPaymentDate || p.paymentDate || p.confirmedDate;
  return d ? new Date(`${d}T12:00:00`) : null;
}

// ─── Operações ─────────────────────────────────────────────────────────────────

export async function createAsaasCustomer(c: {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  mobilePhone?: string | null;
  postalCode?: string | null;
  externalReference: string;
}) {
  return asaasFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: c.name,
      cpfCnpj: c.cpfCnpj.replace(/\D/g, ''),
      email: c.email || undefined,
      mobilePhone: c.mobilePhone?.replace(/\D/g, '') || undefined,
      postalCode: c.postalCode?.replace(/\D/g, '') || undefined,
      externalReference: c.externalReference,
      // Mantém os avisos automáticos do Asaas (criação, vencimento próximo, atraso)
      notificationDisabled: false,
    }),
  });
}

export async function createAsaasPayment(p: {
  customer: string;
  billingType: AsaasBillingType;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference: string;
  installmentCount?: number;
  /** Multa por atraso (%) e juros de mora ao mês (%) — cobrados pelo Asaas após o vencimento. */
  finePercent?: number;
  interestPercent?: number;
}) {
  const installments = p.installmentCount && p.installmentCount > 1 ? p.installmentCount : undefined;
  return asaasFetch<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: p.customer,
      billingType: p.billingType,
      dueDate: p.dueDate,
      description: p.description.slice(0, 500),
      externalReference: p.externalReference,
      ...(p.finePercent ? { fine: { value: p.finePercent, type: 'PERCENTAGE' } } : {}),
      ...(p.interestPercent ? { interest: { value: p.interestPercent } } : {}),
      ...(installments
        ? { installmentCount: installments, totalValue: toReais(p.amountCents) }
        : { value: toReais(p.amountCents) }),
    }),
  });
}

export const getAsaasPayment = (id: string) => asaasFetch<AsaasPayment>(`/payments/${id}`);
export const getAsaasPixQrCode = (id: string) => asaasFetch<AsaasPixQrCode>(`/payments/${id}/pixQrCode`);
export const deleteAsaasPayment = (id: string) => asaasFetch<{ deleted: boolean }>(`/payments/${id}`, { method: 'DELETE' });

/** Valida CPF (11) ou CNPJ (14) pelos dígitos verificadores — o Asaas recusa documentos inválidos. */
export function isValidCpfCnpj(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) {
    if (/^(\d)\1+$/.test(d)) return false;
    const calc = (len: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return false;
    const calc = (len: number) => {
      const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = weights.reduce((s, w, i) => s + Number(d[i]) * w, 0);
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
  }
  return false;
}
