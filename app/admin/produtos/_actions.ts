'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/slugify';

function parsePrice(value: string): number {
  // Aceita "1299,90" ou "1299.90"
  return Math.round(parseFloat(value.replace(',', '.')) * 100);
}

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  shortDesc: z.string().min(1).max(200),
  description: z.string().default(''),
  priceReais: z.string().min(1),
  originalPriceReais: z.string().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  active: z.string().transform((v) => v === 'true'),
  featured: z.string().transform((v) => v === 'true'),
  images: z.string().transform((v) => JSON.parse(v) as string[]),
  specs: z.string().transform((v) => {
    const arr = JSON.parse(v) as { key: string; value: string }[];
    return Object.fromEntries(arr.filter((s) => s.key).map((s) => [s.key, s.value]));
  }),
});

export async function createProduct(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const originalPriceCents =
    data.originalPriceReais ? parsePrice(data.originalPriceReais) : null;

  await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug || slugify(data.name),
      sku: data.sku,
      categoryId: data.categoryId,
      shortDesc: data.shortDesc,
      description: data.description,
      priceCents: parsePrice(data.priceReais),
      originalPriceCents,
      stock: data.stock,
      active: data.active,
      featured: data.featured,
      images: data.images,
      specs: data.specs,
    },
  });

  revalidateTag('products', 'max');
  revalidatePath('/');
  revalidatePath('/admin/produtos');
  redirect('/admin/produtos');
}

export async function updateProduct(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const originalPriceCents =
    data.originalPriceReais ? parsePrice(data.originalPriceReais) : null;

  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      categoryId: data.categoryId,
      shortDesc: data.shortDesc,
      description: data.description,
      priceCents: parsePrice(data.priceReais),
      originalPriceCents,
      stock: data.stock,
      active: data.active,
      featured: data.featured,
      images: data.images,
      specs: data.specs,
    },
  });

  revalidateTag('products', 'max');
  revalidatePath('/');
  revalidatePath('/admin/produtos');
  redirect('/admin/produtos');
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidateTag('products', 'max');
  revalidatePath('/');
  revalidatePath('/admin/produtos');
}
