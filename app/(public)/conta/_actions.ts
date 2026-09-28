'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireCustomer } from '@/lib/customer-session';
import { parseTaxId, sameTaxId } from '@/lib/domains/customers/tax-id';
import { fiscalProfileFields, resolveFiscalProfile, saveFiscalProfile } from '@/lib/domains/customers/fiscal-profile';
import { generateOrderNumber, withUniqueRetry } from '@/lib/order-number';
import { logOrderEvent, recalcOrder, ensurePublicToken } from '@/lib/orders/ledger';
import { emailLayout, sendEmailSafe } from '@/lib/email';

type Result = { ok: true; message?: string } | { error: string; field?: string };

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(160),
  doc: opt(20),
  phone: opt(30),
  contact: opt(120),
  ...fiscalProfileFields,
});

/** O cliente atualiza o PRÓPRIO cadastro (nunca recebe id do navegador). */
export async function updateMyProfile(formData: FormData): Promise<Result> {
  const { customer } = await requireCustomer('/conta/dados');
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? 'Revise os dados.', field: String(issue?.path[0] ?? '') };
  }
  const d = parsed.data;
  const taxId = d.doc ? parseTaxId(d.doc) : null;
  if (taxId && !taxId.ok) return { error: taxId.reason, field: 'doc' };
  // Documento já usado em cobranças no Asaas não pode ser trocado pelo cliente
  if (customer.asaasCustomerId && customer.doc && d.doc && !sameTaxId(d.doc, customer.doc)) {
    return { error: 'Para alterar o CPF/CNPJ fale com a nossa equipe.', field: 'doc' };
  }
  const fiscal = await resolveFiscalProfile({ ...d, tradeName: customer.tradeName ?? '' });
  if ('field' in fiscal) return { error: fiscal.message, field: fiscal.field };
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        name: d.name,
        doc: taxId?.ok ? taxId.value : null,
        phone: d.phone || null,
        contact: d.contact || null,
      },
    });
    await saveFiscalProfile(tx, customer.id, fiscal);
  });
  revalidatePath('/conta');
  return { ok: true, message: 'Cadastro atualizado.' };
}

const quoteSchema = z.object({
  slug: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  notes: opt(1000),
});

/**
 * Solicitação de orçamento pelo site: cria um pedido ORÇAMENTO (origem SITE)
 * vinculado ao cliente logado e avisa a equipe por e-mail.
 */
export async function requestQuote(formData: FormData) {
  const slug = String(formData.get('slug') ?? '');
  const { customer } = await requireCustomer(`/vitrine/${slug}`);
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/vitrine/${slug}?orcamento=erro`);
  const d = parsed.data;

  const product = await prisma.product.findFirst({ where: { slug: d.slug, active: true } });
  if (!product) redirect('/vitrine');

  // Evita duplicar: mesmo produto já em orçamento aberto recente do cliente
  const recent = await prisma.order.findFirst({
    where: {
      customerId: customer.id, source: 'SITE', status: 'ORCAMENTO',
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
      items: { some: { productId: product.id } },
    },
    select: { number: true },
  });
  if (recent) redirect(`/conta/pedidos/${recent.number}`);

  const order = await withUniqueRetry(async () =>
    prisma.order.create({
      data: {
        number: await generateOrderNumber(),
        customerId: customer.id,
        status: 'ORCAMENTO',
        source: 'SITE',
        notes: d.notes ? `Observação do cliente: ${d.notes}` : null,
        items: {
          create: [{
            productId: product.id,
            name: product.name,
            description: product.sku,
            quantity: d.quantity,
            unitPriceCents: product.priceCents, // 0 = sob cotação: a equipe precifica
            position: 0,
          }],
        },
      },
    }),
  );
  await logOrderEvent(prisma, order.id, 'CREATED', `Orçamento solicitado pelo cliente no site: ${d.quantity}× ${product.name}`, 'cliente');
  await recalcOrder(order.id, 'cliente');
  await ensurePublicToken(order.id);

  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.NEXT_PUBLIC_COMPANY_EMAIL;
  if (to) {
    const { html, text } = emailLayout({
      title: `Novo orçamento ${order.number}`,
      intro: `${customer.name} solicitou ${d.quantity}× ${product.name} (${product.sku}) pelo site.${d.notes ? ` Observação: ${d.notes}` : ''}`,
      cta: { label: 'Abrir no painel', url: `${site}/admin/pedidos/${order.id}` },
    });
    await sendEmailSafe({ to, subject: `Novo orçamento pelo site — ${order.number}`, html, text });
  }

  revalidatePath('/conta');
  revalidatePath('/admin/pedidos');
  redirect(`/conta/pedidos/${order.number}?novo=1`);
}
