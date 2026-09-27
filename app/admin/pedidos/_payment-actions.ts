'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency, parseCurrencyToCents } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/finance-labels';
import { ensurePublicToken, logOrderEvent, recalcOrder } from '@/lib/orders/ledger';
import { AsaasError, asaasConfigIssue, deleteAsaasPayment, getAsaasPayment, isValidCpfCnpj } from '@/lib/asaas';
import { ensureAsaasCustomer, issueAsaasCharge } from '@/lib/orders/asaas-charge';
import { BILLING_RULES, buildPlan, evaluateEligibility, type CustomerCredit } from '@/lib/billing/plan';
import { applyAsaasPayment } from '@/lib/orders/asaas-sync';
import { notifyChargeCreated } from '@/lib/orders/notify';

type Result = { ok: true; message?: string } | { error: string };

function refresh(orderId: string) {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/admin/pedidos');
  revalidatePath('/admin/comissoes');
  revalidatePath('/admin');
}

const chargeSchema = z.object({
  method: z.enum(['CLIENTE_ESCOLHE', 'PIX', 'BOLETO', 'CARTAO']),
  amount: z.string().min(1, 'Informe o valor'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento'),
  installments: z.coerce.number().int().min(1).max(21).default(1),
  description: z.string().max(500).optional().or(z.literal('')),
});

/** Gera uma cobrança no Asaas (PIX, boleto, cartão ou "cliente escolhe") para o pedido. */
export async function createAsaasCharge(orderId: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const issue = asaasConfigIssue();
  if (issue) return { error: `Asaas desligado: ${issue}.` };

  const parsed = chargeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;
  const amountCents = parseCurrencyToCents(d.amount);
  if (amountCents < 500) return { error: 'O Asaas exige valor mínimo de R$ 5,00.' };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (!order) return { error: 'Pedido não encontrado.' };
  if (order.status === 'CANCELADO') return { error: 'Pedido cancelado não pode ser cobrado.' };
  const c = order.customer;
  if (!c.doc || !isValidCpfCnpj(c.doc)) {
    return { error: 'O cliente precisa de CPF/CNPJ válido para gerar cobrança. Atualize o cadastro do cliente.' };
  }

  const hasLateFees = d.method === 'BOLETO' || d.method === 'CLIENTE_ESCOLHE';
  let payment: Awaited<ReturnType<typeof issueAsaasCharge>>;
  try {
    payment = await issueAsaasCharge({
      orderId,
      asaasCustomerId: await ensureAsaasCustomer(c),
      method: d.method as PaymentMethod,
      amountCents,
      dueDate: d.dueDate,
      description: d.description || `Pedido ${order.number} — L&E Torneadora`,
      installmentCount: d.installments,
      // Multa/juros por atraso só fazem sentido em boleto (ou quando o cliente escolhe)
      finePercent: hasLateFees ? BILLING_RULES.finePercent : undefined,
      interestPercent: hasLateFees ? BILLING_RULES.interestPercent : undefined,
    });
  } catch (error) {
    return { error: error instanceof AsaasError ? `Asaas: ${error.message}` : 'Não foi possível gerar a cobrança. Tente novamente.' };
  }

  await logOrderEvent(
    prisma, orderId, 'PAYMENT',
    `Cobrança Asaas gerada: ${PAYMENT_METHOD_LABELS[d.method as PaymentMethod]} · ${formatCurrency(amountCents)}${d.installments > 1 ? ` em ${d.installments}x` : ''} · vence ${d.dueDate.split('-').reverse().join('/')}`,
    'admin', { paymentId: payment.id, externalId: payment.externalId },
  );
  // Demais parcelas (parcelamento nativo) chegam pelo webhook PAYMENT_CREATED
  await recalcOrder(orderId, 'admin');
  await ensurePublicToken(orderId);
  await notifyChargeCreated(orderId, payment.amountCents, d.dueDate);
  refresh(orderId);
  return { ok: true, message: 'Cobrança gerada no Asaas e cliente avisado por e-mail.' };
}

const planSchema = z.object({
  down: z.string().min(1, 'Informe a entrada'),
  installments: z.coerce.number().int().min(1).max(5),
  downMethod: z.enum(['PIX', 'CLIENTE_ESCOLHE', 'BOLETO']),
  downDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento da entrada'),
  firstInstallmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento da 1ª parcela'),
  override: z.string().optional(),
  notes: z.string().max(300).optional().or(z.literal('')),
});

/**
 * Parcelamento negociado: entrada (≥ 45%) + até 5 boletos mensais, cada um uma
 * cobrança própria no Asaas com multa e juros por atraso. Regras em lib/billing/plan.ts.
 */
export async function createPaymentPlan(orderId: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const issue = asaasConfigIssue();
  if (issue) return { error: `Asaas desligado: ${issue}.` };
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (!order) return { error: 'Pedido não encontrado.' };
  if (order.status === 'CANCELADO') return { error: 'Pedido cancelado não pode ser cobrado.' };
  const c = order.customer;
  if (!c.doc || !isValidCpfCnpj(c.doc)) return { error: 'O cliente precisa de CPF/CNPJ válido. Atualize o cadastro.' };

  // Saldo = total − pago − o que já está em cobrança aberta
  const openCharges = await prisma.payment.aggregate({ where: { orderId, status: { in: ['PENDENTE', 'VENCIDO'] } }, _sum: { amountCents: true } });
  const balance = order.totalCents - order.paidCents - (openCharges._sum.amountCents ?? 0);
  if (balance <= 0) return { error: 'Não há saldo a parcelar (já pago ou com cobranças em aberto). Cancele as cobranças abertas antes.' };

  const credit = await getCustomerCredit(c.id);
  const elig = evaluateEligibility(balance, credit);
  if (d.installments > elig.maxInstallments) return { error: `Para este valor o máximo é ${elig.maxInstallments}x.` };
  if (!elig.eligible && d.override !== 'true') return { error: `Parcelamento não recomendado: ${elig.reasons[0]} Marque "liberar mesmo assim" para seguir.` };

  const { lines, error } = buildPlan({
    balanceCents: balance, downCents: parseCurrencyToCents(d.down), installments: d.installments,
    downDueDate: d.downDueDate, firstInstallmentDate: d.firstInstallmentDate,
  });
  if (error) return { error };

  const plan = await prisma.paymentPlan.create({
    data: {
      orderId, totalCents: balance, downPaymentCents: lines[0].amountCents, installments: d.installments,
      finePercent: BILLING_RULES.finePercent, interestPercent: BILLING_RULES.interestPercent, notes: d.notes || null,
    },
  });

  const asaasCustomerId = await ensureAsaasCustomer(c).catch((e) => e as Error);
  if (asaasCustomerId instanceof Error) {
    await prisma.paymentPlan.delete({ where: { id: plan.id } });
    return { error: asaasCustomerId instanceof AsaasError ? `Asaas: ${asaasCustomerId.message}` : 'Falha ao cadastrar o cliente no Asaas.' };
  }

  // Emite em sequência; se o Asaas falhar no meio, o que já foi emitido fica registrado
  const issued: string[] = [];
  let failure = '';
  for (const line of lines) {
    try {
      await issueAsaasCharge({
        orderId, asaasCustomerId,
        method: line.kind === 'ENTRADA' ? (d.downMethod as PaymentMethod) : 'BOLETO',
        amountCents: line.amountCents,
        dueDate: line.dueDate,
        description: `Pedido ${order.number} — ${line.label}`,
        finePercent: BILLING_RULES.finePercent,
        interestPercent: BILLING_RULES.interestPercent,
        planId: plan.id,
        planLabel: line.label,
      });
      issued.push(`${line.label} ${formatCurrency(line.amountCents)}`);
    } catch (e) {
      failure = e instanceof AsaasError ? e.message : 'erro de comunicação';
      break;
    }
  }

  if (!issued.length) {
    await prisma.paymentPlan.delete({ where: { id: plan.id } });
    return { error: `Asaas: ${failure}` };
  }
  await logOrderEvent(
    prisma, orderId, 'PAYMENT',
    `Parcelamento criado: entrada ${formatCurrency(lines[0].amountCents)} + ${d.installments}x no boleto (multa ${BILLING_RULES.finePercent}%, juros ${BILLING_RULES.interestPercent}% a.m.)${failure ? ` — INCOMPLETO: ${failure}` : ''}`,
    'admin', { planId: plan.id, issued },
  );
  await recalcOrder(orderId, 'admin');
  await ensurePublicToken(orderId);
  await notifyChargeCreated(orderId, lines[0].amountCents, lines[0].dueDate);
  refresh(orderId);
  return failure
    ? { error: `Emitidas ${issued.length} de ${lines.length} cobranças. Asaas recusou a próxima: ${failure}. Emita o restante manualmente.` }
    : { ok: true, message: `Parcelamento emitido: ${lines.length} cobranças no Asaas. Cliente avisado.` };
}

/** Histórico de crédito do cliente (base da análise de parcelamento). */
async function getCustomerCredit(customerId: string): Promise<CustomerCredit> {
  const [paidOrders, paid, overdue] = await Promise.all([
    prisma.order.count({ where: { customerId, paymentStatus: 'PAGO' } }),
    prisma.payment.aggregate({ where: { order: { customerId }, status: { in: ['RECEBIDO', 'CONFIRMADO'] } }, _sum: { amountCents: true } }),
    prisma.payment.count({ where: { order: { customerId, status: { not: 'CANCELADO' } }, OR: [{ status: 'VENCIDO' }, { status: 'PENDENTE', dueDate: { lt: new Date() } }] } }),
  ]);
  return { paidOrders, paidCents: paid._sum.amountCents ?? 0, overdueCount: overdue };
}

/** Dados para o simulador no painel do pedido. */
export async function getPlanContext(orderId: string): Promise<{ balanceCents: number; credit: CustomerCredit } | { error: string }> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true, totalCents: true, paidCents: true } });
  if (!order) return { error: 'Pedido não encontrado.' };
  const openCharges = await prisma.payment.aggregate({ where: { orderId, status: { in: ['PENDENTE', 'VENCIDO'] } }, _sum: { amountCents: true } });
  return {
    balanceCents: Math.max(0, order.totalCents - order.paidCents - (openCharges._sum.amountCents ?? 0)),
    credit: await getCustomerCredit(order.customerId),
  };
}

const manualSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.string().min(1, 'Informe o valor'),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
  description: z.string().max(300).optional().or(z.literal('')),
});

/** Lança um recebimento feito fora do Asaas (PIX direto, TED, dinheiro, promissória…). */
export async function registerManualPayment(orderId: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;
  const amountCents = parseCurrencyToCents(d.amount);
  if (amountCents <= 0) return { error: 'Informe um valor maior que zero.' };

  const paidAt = new Date(`${d.paidAt}T12:00:00`);
  const payment = await prisma.payment.create({
    data: {
      orderId, provider: 'MANUAL', method: d.method, status: 'RECEBIDO', amountCents, netCents: amountCents,
      paidAt, dueDate: paidAt, description: d.description || null,
    },
  });
  await logOrderEvent(prisma, orderId, 'PAYMENT', `Recebimento manual: ${PAYMENT_METHOD_LABELS[d.method]} · ${formatCurrency(amountCents)}`, 'admin', { paymentId: payment.id });
  await recalcOrder(orderId, 'admin');
  refresh(orderId);
  return { ok: true, message: 'Recebimento registrado.' };
}

/** Consulta o Asaas e atualiza a cobrança (útil se um webhook falhar). */
export async function syncAsaasPayment(paymentId: string): Promise<Result> {
  await requireAdmin();
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p?.externalId) return { error: 'Cobrança sem vínculo com o Asaas.' };
  try {
    await applyAsaasPayment(p.id, await getAsaasPayment(p.externalId), 'admin');
  } catch (error) {
    return { error: error instanceof AsaasError ? `Asaas: ${error.message}` : 'Falha ao consultar o Asaas.' };
  }
  refresh(p.orderId);
  return { ok: true, message: 'Cobrança atualizada.' };
}

/** Cancela a cobrança (no Asaas, se houver) sem apagar o histórico. */
export async function cancelPayment(paymentId: string): Promise<Result> {
  await requireAdmin();
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) return { error: 'Cobrança não encontrada.' };
  if (p.status === 'RECEBIDO' || p.status === 'CONFIRMADO') {
    return { error: p.provider === 'ASAAS' ? 'Cobrança já paga: faça o estorno pelo painel do Asaas.' : 'Recebimento já lançado — cancele para desfazer o lançamento.' };
  }
  if (p.provider === 'ASAAS' && p.externalId) {
    try {
      await deleteAsaasPayment(p.externalId);
    } catch (error) {
      return { error: error instanceof AsaasError ? `Asaas: ${error.message}` : 'Falha ao cancelar no Asaas.' };
    }
  }
  await prisma.payment.update({ where: { id: p.id }, data: { status: 'CANCELADO' } });
  await logOrderEvent(prisma, p.orderId, 'PAYMENT', `Cobrança de ${formatCurrency(p.amountCents)} cancelada`, 'admin', { paymentId: p.id });
  await recalcOrder(p.orderId, 'admin');
  refresh(p.orderId);
  return { ok: true, message: 'Cobrança cancelada.' };
}

/** Desfaz um lançamento manual registrado por engano. */
export async function voidManualPayment(paymentId: string): Promise<Result> {
  await requireAdmin();
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.provider !== 'MANUAL') return { error: 'Somente lançamentos manuais podem ser desfeitos.' };
  await prisma.payment.update({ where: { id: p.id }, data: { status: 'CANCELADO' } });
  await logOrderEvent(prisma, p.orderId, 'PAYMENT', `Lançamento manual de ${formatCurrency(p.amountCents)} desfeito`, 'admin', { paymentId: p.id });
  await recalcOrder(p.orderId, 'admin');
  refresh(p.orderId);
  return { ok: true, message: 'Lançamento desfeito.' };
}

/** Gera (se necessário) o link público de acompanhamento do pedido. */
export async function createPublicLink(orderId: string): Promise<{ ok: true; token: string } | { error: string }> {
  await requireAdmin();
  const token = await ensurePublicToken(orderId);
  refresh(orderId);
  return { ok: true, token };
}
