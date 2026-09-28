'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { slugify } from '@/lib/slugify';
import { parseImportPrice } from '@/lib/product-import';

/** Preço “De” (riscado) só faz sentido acima do preço atual; senão a oferta some sem aviso. */
function promoError(priceCents: number, originalPriceCents: number | null) {
  if (originalPriceCents === null || originalPriceCents === 0) return null;
  if (priceCents <= 0) return { originalPriceReais: ['Produto sob cotação (preço 0) não pode ter “Preço De”.'] };
  if (originalPriceCents <= priceCents) return { originalPriceReais: ['O “Preço De” é o valor antigo, que aparece riscado: precisa ser maior que o Preço. Ex.: vender por 50 mostrando “de 350” → Preço 50 e De 350.'] };
  return null;
}

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  shortDesc: z.string().min(1).max(200),
  description: z.string().default(''),
  priceReais: z.string().refine((value) => parseImportPrice(value) !== null),
  originalPriceReais: z.string().optional().refine((value) => !value || parseImportPrice(value) !== null),
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
  if (!(await isAuthenticated())) return { error: 'Sessão expirada. Entre novamente no painel.' };
  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const originalPriceCents =
    data.originalPriceReais ? parseImportPrice(data.originalPriceReais) : null;
  const promo = promoError(parseImportPrice(data.priceReais)!, originalPriceCents);
  if (promo) return { error: promo };

  try { await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug || slugify(data.name),
      sku: data.sku,
      categoryId: data.categoryId,
      shortDesc: data.shortDesc,
      description: data.description,
      priceCents: parseImportPrice(data.priceReais)!,
      originalPriceCents,
      stock: data.stock,
      active: data.active,
      featured: data.featured,
      images: data.images,
      specs: data.specs,
    },
  }); } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return { error: 'SKU ou URL já cadastrado. Ajuste a referência e tente novamente.' };
    return { error: 'Não foi possível salvar o produto. Tente novamente.' };
  }

  revalidateProductViews();
  // Slide-over do painel: devolve sucesso e deixa o cliente fechar o painel mantendo filtros
  if (formData.get('mode') === 'inline') return { ok: true as const };
  redirect('/admin/produtos');
}

export async function updateProduct(id: string, formData: FormData) {
  if (!(await isAuthenticated())) return { error: 'Sessão expirada. Entre novamente no painel.' };
  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const originalPriceCents =
    data.originalPriceReais ? parseImportPrice(data.originalPriceReais) : null;
  const promo = promoError(parseImportPrice(data.priceReais)!, originalPriceCents);
  if (promo) return { error: promo };

  try { await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      categoryId: data.categoryId,
      shortDesc: data.shortDesc,
      description: data.description,
      priceCents: parseImportPrice(data.priceReais)!,
      originalPriceCents,
      stock: data.stock,
      active: data.active,
      featured: data.featured,
      images: data.images,
      specs: data.specs,
    },
  }); } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return { error: 'SKU ou URL já cadastrado. Ajuste a referência e tente novamente.' };
    return { error: 'Não foi possível atualizar o produto. Tente novamente.' };
  }

  revalidateProductViews();
  if (formData.get('mode') === 'inline') return { ok: true as const };
  redirect('/admin/produtos');
}

export async function deleteProduct(id: string): Promise<{ error: string } | { ok: true }> {
  if (!(await isAuthenticated())) return { error: 'Sessão expirada. Entre novamente no painel.' };
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    return { error: `Este produto está vinculado a ${orderItemCount} pedido(s) já registrados.` };
  }
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o produto. Tente novamente.' };
  }
  revalidateProductViews();
  return { ok: true as const };
}

/** Edição inline na listagem: alterna Publicado / Destaque sem abrir o formulário. */
export async function toggleProductFlag(
  id: string,
  field: 'active' | 'featured',
  value: boolean,
): Promise<{ error: string } | { ok: true }> {
  if (!(await isAuthenticated())) return { error: 'Sessão expirada. Entre novamente no painel.' };
  try {
    await prisma.product.update({ where: { id }, data: { [field]: value } });
  } catch {
    return { error: 'Não foi possível atualizar o produto.' };
  }
  revalidateProductViews();
  return { ok: true as const };
}

function revalidateProductViews() {
  revalidateTag('products', 'max');
  revalidatePath('/');
  revalidatePath('/vitrine', 'layout');
  revalidatePath('/admin/produtos');
}

/** Edição inline do preço na listagem (0 = sob cotação). */
export async function updateProductPrice(id: string, priceReais: string): Promise<{ error: string } | { ok: true; priceCents: number }> {
  if (!(await isAuthenticated())) return { error: 'Sessão expirada. Entre novamente no painel.' };
  const cents = parseImportPrice(priceReais.trim() === '' ? '0' : priceReais);
  if (cents === null || cents < 0) return { error: 'Preço inválido. Use 12.500,00 ou 0 para sob cotação.' };
  try {
    await prisma.product.update({ where: { id }, data: { priceCents: cents } });
  } catch {
    return { error: 'Não foi possível salvar o preço.' };
  }
  revalidateProductViews();
  return { ok: true, priceCents: cents };
}
