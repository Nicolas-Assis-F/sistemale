// Avisos por e-mail ao cliente sobre o pedido (server-only). Nunca lançam erro.
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { emailLayout, sendEmailSafe } from '@/lib/email';
import { ensurePublicToken } from './ledger';

async function orderContact(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true, customer: { select: { name: true, email: true, user: { select: { email: true, emailVerified: true } } } } },
  });
  // Prioriza o e-mail verificado da conta; senão o do cadastro
  const to = order?.customer.user?.emailVerified ? order.customer.user.email : order?.customer.email;
  if (!order || !to) return null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const url = order.customer.user ? `${site}/conta/pedidos/${order.number}` : `${site}/pedido/${await ensurePublicToken(orderId)}`;
  return { to, url, number: order.number, first: order.customer.name.split(' ')[0] };
}

export async function notifyChargeCreated(orderId: string, amountCents: number, dueDate: string) {
  const c = await orderContact(orderId);
  if (!c) return;
  const { html, text } = emailLayout({
    title: `Pagamento do pedido ${c.number}`,
    intro: `Olá, ${c.first}. A cobrança de ${formatCurrency(amountCents)} do seu pedido está disponível, com vencimento em ${dueDate.split('-').reverse().join('/')}. Pague por PIX, boleto ou cartão pelo link abaixo.`,
    cta: { label: 'Ver pedido e pagar', url: c.url },
  });
  await sendEmailSafe({ to: c.to, subject: `Pagamento disponível — pedido ${c.number}`, html, text });
}

export async function notifyPaymentConfirmed(orderId: string, amountCents: number) {
  const c = await orderContact(orderId);
  if (!c) return;
  const { html, text } = emailLayout({
    title: 'Pagamento confirmado ✓',
    intro: `Olá, ${c.first}. Recebemos ${formatCurrency(amountCents)} referente ao pedido ${c.number}. Obrigado pela confiança — você pode acompanhar a fabricação pelo link.`,
    cta: { label: 'Acompanhar pedido', url: c.url },
  });
  await sendEmailSafe({ to: c.to, subject: `Pagamento confirmado — pedido ${c.number}`, html, text });
}

/** Orçamento pedido pelo site recebeu preço da equipe. */
export async function notifyQuoteReady(orderId: string, totalCents: number) {
  const c = await orderContact(orderId);
  if (!c) return;
  const { html, text } = emailLayout({
    title: `Seu orçamento ${c.number} está pronto`,
    intro: `Olá, ${c.first}. Nossa engenharia preparou o orçamento: ${formatCurrency(totalCents)}. Confira itens, condições e prazo pelo link — qualquer ajuste é só responder pelo WhatsApp.`,
    cta: { label: 'Ver orçamento', url: c.url },
  });
  await sendEmailSafe({ to: c.to, subject: `Orçamento pronto — ${c.number}`, html, text });
}
