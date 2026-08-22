'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const gallerySchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(160),
  description: z.string().max(500).optional().or(z.literal('')),
  imageUrl: z.string().min(1, 'Imagem obrigatória'),
  category: z.string().max(80).optional().or(z.literal('')),
  order: z.coerce.number().int().default(0),
  active: z.string().transform((v) => v === 'true'),
});

function revalidate() {
  revalidateTag('gallery', 'max');
  revalidatePath('/');
  revalidatePath('/galeria');
  revalidatePath('/admin/galeria');
}

export async function createGalleryItem(formData: FormData) {
  const parsed = gallerySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  await prisma.galleryItem.create({
    data: {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl,
      category: data.category || null,
      order: data.order,
      active: data.active,
    },
  });
  revalidate();
  redirect('/admin/galeria');
}

export async function updateGalleryItem(id: string, formData: FormData) {
  const parsed = gallerySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  await prisma.galleryItem.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl,
      category: data.category || null,
      order: data.order,
      active: data.active,
    },
  });
  revalidate();
  redirect('/admin/galeria');
}

export async function deleteGalleryItem(id: string): Promise<{ error: string } | { ok: true }> {
  try {
    await prisma.galleryItem.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir a foto. Tente novamente.' };
  }
  revalidate();
  return { ok: true as const };
}
