// Compra direta pela vitrine (server-only, NÃO é Server Action).
// O preço vem SEMPRE do banco; do navegador só chegam produto, quantidade e meio.
import type { Customer } from '@prisma/client';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { AsaasError, asaasConfigIssue, deleteAsaasPayment } from '@/lib/asaas';
import { isValidTaxId } from '@/lib/domains/customers/tax-id';
import { generateOrderNumber, withUniqueRetry } from '@/lib/order-number';
import { ensurePublicToken, logOrderEvent, recalcOrder } from './ledger';
import { ensureAsaasCustomer, issueAsaasCharge } from './asaas-charge';
import { emailLayout, sendEmailSafe } from '@/lib/email';

export const CHECKOUT_METHODS = ['PIX', 'CLIENTE_ESCOLHE'] as const;
export type CheckoutMethod = (typeof CHECKOUT_METHODS)[number];

/** Asaas não aceita cobrança abaixo disso. */
export const MIN_CHARGE_CENTS = 500;
/** Reaproveita um checkout igual recente (duplo clique, voltar e clicar de novo). */
const REUSE_WINDOW_MS = 30 * 60_000;

export type CheckoutResult =
  | { ok: true; orderNumber: string; reused: boolean }
  | { ok: false; reason: 'PROFILE'; message: string }
  | { ok: false; reason: 'INVALID' | 'UNAVAILABLE' | 'PROVIDER'; message: string };

/** Vencimento em AAAA-MM-DD no fuso de Brasília, `days` dias à frente. */
export function dueDateBR(days: number, now = new Date()) {
  const d = new Date(now.getTime() + days * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

export async function startCheckout(customer: Customer, input: { slug: string; quantity: number; method: CheckoutMethod }): Promise<CheckoutResult> {
  if (asaasConfigIssue()) return { ok: false, reason: 'UNAVAILABLE', message: 'Pagamento online indisponível no momento. Fale com a nossa equipe.' };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99) {
    return { ok: false, reason: 'INVALID', message: 'Quantidade inválida.' };
  }

  const product = await prisma.product.findFirst({ where: { slug: input.slug, active: true } });
  if (!product) return { ok: false, reason: 'INVALID', message: 'Produto indisponível.' };
  if (product.priceCents <= 0) return { ok: false, reason: 'INVALID', message: 'Este produto é sob cotação: solicite um orçamento.' };
  if (product.stock > 0 && input.quantity > product.stock) {
    return { ok: false, reason: 'INVALID', message: `Temos ${product.stock} unidade(s) em estoque. Para mais, solicite um orçamento.` };
  }
  const totalCents = product.priceCents * input.quantity;
  if (totalCents < MIN_CHARGE_CENTS) return { ok: false, reason: 'INVALID', message: `Valor mínimo para pagamento online: ${formatCurrency(MIN_CHARGE_CENTS)}.` };

  // A cobrança exige CPF/CNPJ válido do pagador
  if (!customer.doc || !isValidTaxId(customer.doc)) {
    return { ok: false, reason: 'PROFILE', message: 'Complete seu CPF ou CNPJ para pagar.' };
  }

  // Mesmo checkout recente: reaproveita o pedido em vez de criar outro (duplo clique,
  // "voltar" e comprar de novo, nova tentativa depois de falha no Asaas)
  const recent = await prisma.order.findFirst({
    where: {
      customerId: customer.id, source: 'SITE', status: 'ORCAMENTO', paymentStatus: { in: ['PENDENTE', 'NAO_COBRADO'] },
      totalCents, createdAt: { gte: new Date(Date.now() - REUSE_WINDOW_MS) },
      items: { every: { productId: product.id, quantity: input.quantity, unitPriceCents: product.priceCents } },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, number: true, payments: { where: { status: { in: ['PENDENTE', 'VENCIDO'] } }, select: { id: true, provider: true, method: true, externalId: true } } },
  });
  if (recent?.payments.some((p) => p.provider === 'ASAAS' && p.method === input.method)) {
    return { ok: true, orderNumber: recent.number, reused: true };
  }
  if (recent) {
    // Trocou a forma de pagamento: cancela a cobrança aberta antes de gerar a nova,
    // para nunca existirem duas cobranças para a mesma compra
    for (const p of recent.payments) {
      try {
        if (p.externalId) await deleteAsaasPayment(p.externalId);
      } catch (error) {
        return { ok: false, reason: 'PROVIDER', message: `Não foi possível trocar a forma de pagamento: ${error instanceof Error ? error.message : String(error)}` };
      }
      await prisma.payment.update({ where: { id: p.id }, data: { status: 'CANCELADO' } });
      await logOrderEvent(prisma, recent.id, 'PAYMENT', 'Cobrança anterior cancelada: cliente trocou a forma de pagamento no checkout', 'cliente', { paymentId: p.id });
    }
  }

  const reusedOrder = Boolean(recent);
  // Pedido reaproveitado de uma tentativa que falhou: a equipe ainda não recebeu o aviso de compra
  const announce = !recent || recent.payments.length === 0;
  const order = recent ?? await withUniqueRetry(async () =>
    prisma.order.create({
      data: {
        number: await generateOrderNumber(),
        customerId: customer.id,
        status: 'ORCAMENTO', // vira PEDIDO sozinho quando o pagamento confirma (recalcOrder)
        source: 'SITE',
        paymentMethod: input.method === 'PIX' ? 'PIX' : 'Cartão, boleto ou PIX',
        items: {
          create: [{
            productId: product.id,
            name: product.name,
            description: product.sku,
            quantity: input.quantity,
            unitPriceCents: product.priceCents,
            position: 0,
          }],
        },
      },
    }),
  );
  if (!reusedOrder) {
    await logOrderEvent(prisma, order.id, 'CREATED', `Compra pelo site: ${input.quantity}× ${product.name} · ${formatCurrency(totalCents)}`, 'cliente');
    await recalcOrder(order.id, 'cliente');
    await ensurePublicToken(order.id);
  }

  const dueDate = dueDateBR(input.method === 'PIX' ? 1 : 3);
  try {
    const payment = await issueAsaasCharge({
      orderId: order.id,
      asaasCustomerId: await ensureAsaasCustomer(customer),
      method: input.method,
      amountCents: totalCents,
      dueDate,
      description: `Pedido ${order.number} — ${input.quantity}× ${product.name} — L&E Torneadora`,
    });
    await logOrderEvent(prisma, order.id, 'PAYMENT', `Cobrança gerada no checkout: ${input.method === 'PIX' ? 'PIX' : 'fatura (cartão/boleto/PIX)'} · ${formatCurrency(payment.amountCents)}`, 'cliente', { paymentId: payment.id, externalId: payment.externalId });
  } catch (error) {
    // Pedido fica registrado sem cobrança: a equipe vê e pode cobrar pelo painel
    await logOrderEvent(prisma, order.id, 'PAYMENT', `Falha ao gerar cobrança no checkout: ${error instanceof Error ? error.message : String(error)}`, 'sistema');
    if (!reusedOrder) await notifyTeam(order.number, order.id, customer.name, `${input.quantity}× ${product.name}`, totalCents, true);
    return { ok: false, reason: 'PROVIDER', message: error instanceof AsaasError ? `Não foi possível gerar o pagamento: ${error.message}` : 'Não foi possível gerar o pagamento. Tente de novo em instantes.' };
  }
  await recalcOrder(order.id, 'cliente');
  if (announce) await notifyTeam(order.number, order.id, customer.name, `${input.quantity}× ${product.name}`, totalCents, false);
  return { ok: true, orderNumber: order.number, reused: reusedOrder };
}

async function notifyTeam(number: string, orderId: string, customerName: string, summary: string, totalCents: number, failed: boolean) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.NEXT_PUBLIC_COMPANY_EMAIL;
  if (!to) return;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const { html, text } = emailLayout({
    title: failed ? `Compra ${number} sem cobrança` : `Nova compra ${number}`,
    intro: `${customerName} comprou ${summary} pelo site (${formatCurrency(totalCents)}).${failed ? ' A cobrança NÃO foi gerada — gere pelo painel.' : ' Aguardando pagamento.'}`,
    cta: { label: 'Abrir no painel', url: `${site}/admin/pedidos/${orderId}` },
  });
  await sendEmailSafe({ to, subject: `${failed ? '⚠ ' : ''}Compra pelo site — ${number}`, html, text });
}
