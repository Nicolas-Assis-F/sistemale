'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency, parseCurrencyToCents } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/finance-labels';
import { ensurePublicToken, logOrderEvent, recalcOrder } from '@/lib/orders/ledger';
import {
  AsaasError, METHOD_TO_BILLING, asaasConfigIssue, createAsaasCustomer, createAsaasPayment,
  deleteAsaasPayment, getAsaasPayment, getAsaasPixQrCode, isValidCpfCnpj, mapAsaasStatus, toCents,
} from '@/lib/asaas';
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

  // 1) Registro local antes da chamada externa: o id dele vai como externalReference
  const payment = await prisma.payment.create({
    data: {
      orderId,
      provider: 'ASAAS',
      method: d.method as PaymentMethod,
      amountCents,
      dueDate: new Date(`${d.dueDate}T12:00:00`),
      description: d.description || `Pedido ${order.number}`,
      installmentCount: d.installments > 1 ? d.installments : null,
    },
  });

  let remote: Awaited<ReturnType<typeof createAsaasPayment>>;
  try {
    let asaasCustomerId = c.asaasCustomerId;
    if (!asaasCustomerId) {
      const created = await createAsaasCustomer({
        name: c.name, cpfCnpj: c.doc, email: c.email, mobilePhone: c.phone, postalCode: c.zip, externalReference: c.id,
      });
      asaasCustomerId = created.id;
      await prisma.customer.update({ where: { id: c.id }, data: { asaasCustomerId } });
    }
    remote = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: METHOD_TO_BILLING[d.method as PaymentMethod]!,
      amountCents,
      dueDate: d.dueDate,
      description: d.description || `Pedido ${order.number} — L&E Torneadora`,
      externalReference: payment.id,
      installmentCount: d.installments,
    });
  } catch (error) {
    // Nada foi criado no Asaas: descarta o registro local
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    return { error: error instanceof AsaasError ? `Asaas: ${error.message}` : 'Não foi possível gerar a cobrança. Tente novamente.' };
  }

  // A partir daqui a cobrança existe no Asaas: o registro local nunca é apagado
  const pix = remote.billingType === 'PIX' ? await getAsaasPixQrCode(remote.id).catch(() => null) : null;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      externalId: remote.id,
      amountCents: toCents(remote.value), // em parcelamento: valor da 1ª parcela
      status: mapAsaasStatus(remote.status, remote.deleted),
      invoiceUrl: remote.invoiceUrl ?? null,
      bankSlipUrl: remote.bankSlipUrl ?? null,
      pixPayload: pix?.payload ?? null,
      pixQrImage: pix?.encodedImage ?? null,
      lastSyncedAt: new Date(),
    },
  });
  await logOrderEvent(
    prisma, orderId, 'PAYMENT',
    `Cobrança Asaas gerada: ${PAYMENT_METHOD_LABELS[d.method as PaymentMethod]} · ${formatCurrency(amountCents)}${d.installments > 1 ? ` em ${d.installments}x` : ''} · vence ${d.dueDate.split('-').reverse().join('/')}`,
    'admin', { paymentId: payment.id, externalId: remote.id },
  );
  // Demais parcelas chegam pelo webhook PAYMENT_CREATED (mesmo externalReference)
  await recalcOrder(orderId, 'admin');
  await ensurePublicToken(orderId);
  await notifyChargeCreated(orderId, toCents(remote.value), d.dueDate);
  refresh(orderId);
  return { ok: true, message: 'Cobrança gerada no Asaas e cliente avisado por e-mail.' };
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
