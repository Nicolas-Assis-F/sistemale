'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateCustomerCode } from '@/lib/order-number';

const customerSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(160),
  doc: z.string().max(40).optional().or(z.literal('')),
  email: z.string().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  address: z.string().max(240).optional().or(z.literal('')),
  city: z.string().max(120).optional().or(z.literal('')),
  state: z.string().max(40).optional().or(z.literal('')),
  zip: z.string().max(20).optional().or(z.literal('')),
  contact: z.string().max(120).optional().or(z.literal('')),
});

function toData(d: z.infer<typeof customerSchema>) {
  return {
    name: d.name,
    doc: d.doc || null,
    email: d.email || null,
    phone: d.phone || null,
    address: d.address || null,
    city: d.city || null,
    state: d.state || null,
    zip: d.zip || null,
    contact: d.contact || null,
  };
}

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const code = await generateCustomerCode();
  await prisma.customer.create({ data: { code, ...toData(parsed.data) } });
  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}

export async function updateCustomer(id: string, formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await prisma.customer.update({ where: { id }, data: toData(parsed.data) });
  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } });
  revalidatePath('/admin/clientes');
}
