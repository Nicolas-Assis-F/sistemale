'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const serviceSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(160),
  description: z.string().min(1, 'Descrição obrigatória').max(2000),
  icon: z.string().max(60).optional().or(z.literal('')),
  order: z.coerce.number().int().default(0),
  active: z.string().transform((v) => v === 'true'),
});

function revalidate() {
  revalidateTag('services', 'max');
  revalidatePath('/');
  revalidatePath('/servicos');
  revalidatePath('/admin/servicos');
}

export async function createService(formData: FormData) {
  await requireAdmin();
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  await prisma.serviceItem.create({
    data: { title: data.title, description: data.description, icon: data.icon || null, order: data.order, active: data.active },
  });
  revalidate();
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/servicos');
}

export async function updateService(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  await prisma.serviceItem.update({
    where: { id },
    data: { title: data.title, description: data.description, icon: data.icon || null, order: data.order, active: data.active },
  });
  revalidate();
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/servicos');
}

export async function deleteService(id: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  try {
    await prisma.serviceItem.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o serviço. Tente novamente.' };
  }
  revalidate();
  return { ok: true as const };
}
