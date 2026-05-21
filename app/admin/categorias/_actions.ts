'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/slugify';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  icon: z.string().max(200).optional().or(z.literal('')),
  order: z.coerce.number().int().default(0),
});

export async function createCategory(formData: FormData) {
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
  redirect('/admin/categorias');
}

export async function updateCategory(id: string, formData: FormData) {
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
  redirect('/admin/categorias');
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
  revalidateTag('categories', 'max');
  revalidatePath('/');
  revalidatePath('/admin/categorias');
}
