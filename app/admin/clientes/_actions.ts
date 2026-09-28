'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateCustomerCode } from '@/lib/order-number';
import { requireAdmin } from '@/lib/auth';
import { parseTaxId } from '@/lib/domains/customers/tax-id';
import { fiscalProfileFields, resolveFiscalProfile, saveFiscalProfile } from '@/lib/domains/customers/fiscal-profile';

const customerSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(160),
  doc: z.string().max(40).optional().or(z.literal('')),
  email: z.string().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  contact: z.string().max(120).optional().or(z.literal('')),
  ...fiscalProfileFields,
});

/**
 * Documento novo/alterado precisa ser válido e é salvo na forma canônica. Um
 * documento antigo inválido que o usuário não mexeu é mantido como está, para
 * não travar a edição dos outros campos do cadastro.
 */
function resolveDoc(input: string | undefined, current?: string | null): { doc: string | null } | { error: string } {
  if (!input) return { doc: null };
  const r = parseTaxId(input);
  if (r.ok) return { doc: r.value };
  if (current && input.trim() === current.trim()) return { doc: current };
  return { error: r.reason };
}

function toData(d: z.infer<typeof customerSchema>, doc: string | null) {
  return {
    name: d.name,
    doc,
    email: d.email || null,
    phone: d.phone || null,
    contact: d.contact || null,
  };
}

export async function createCustomer(formData: FormData) {
  await requireAdmin();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const doc = resolveDoc(parsed.data.doc);
  if ('error' in doc) return { error: { doc: [doc.error] } };
  const fiscal = await resolveFiscalProfile(parsed.data);
  if ('field' in fiscal) return { error: { [fiscal.field]: [fiscal.message] } };
  const code = await generateCustomerCode();
  await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({ data: { code, ...toData(parsed.data, doc.doc) } });
    await saveFiscalProfile(tx, created.id, fiscal);
  });
  revalidatePath('/admin/clientes');
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/clientes');
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const current = await prisma.customer.findUnique({ where: { id }, select: { doc: true } });
  const doc = resolveDoc(parsed.data.doc, current?.doc);
  if ('error' in doc) return { error: { doc: [doc.error] } };
  const fiscal = await resolveFiscalProfile(parsed.data);
  if ('field' in fiscal) return { error: { [fiscal.field]: [fiscal.message] } };
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data: toData(parsed.data, doc.doc) });
    await saveFiscalProfile(tx, id, fiscal);
  });
  revalidatePath('/admin/clientes');
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/clientes');
}

export async function deleteCustomer(id: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const orderCount = await prisma.order.count({ where: { customerId: id } });
  if (orderCount > 0) {
    return { error: `Não é possível excluir: existem ${orderCount} pedido(s) vinculados a este cliente.` };
  }
  try {
    await prisma.customer.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o cliente. Tente novamente.' };
  }
  revalidatePath('/admin/clientes');
  return { ok: true as const };
}
