'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/slugify';
import { requireAdmin } from '@/lib/auth';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  icon: z.string().max(200).optional().or(z.literal('')),
  order: z.coerce.number().int().default(0),
});

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug || slugify(data.name),
      description: data.description || null,
      icon: data.icon || null,
      order: data.order,
    },
  });

  revalidateTag('categories', 'max');
  revalidatePath('/');
  revalidatePath('/admin/categorias');
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/categorias');
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      icon: data.icon || null,
      order: data.order,
    },
  });

  revalidateTag('categories', 'max');
  revalidatePath('/');
  revalidatePath('/admin/categorias');
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/categorias');
}

export async function deleteCategory(id: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return { error: `Não é possível excluir: existem ${productCount} produto(s) vinculados a esta categoria.` };
  }
  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir a categoria. Tente novamente.' };
  }
  revalidateTag('categories', 'max');
  revalidatePath('/');
  revalidatePath('/admin/categorias');
  return { ok: true as const };
}
