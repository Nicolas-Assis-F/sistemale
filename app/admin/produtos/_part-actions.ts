'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { parseCurrencyToCents } from '@/lib/format';
import type { PartItem } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';

export type PartData = {
  name: string;
  location?: string;
  category: string;
  quantity: number;
  unitPriceReais?: string;
  notes?: string;
};

export async function createPartItem(
  productId: string,
  data: PartData,
): Promise<{ error: string } | PartItem> {
  await requireAdmin();
  try {
    const created = await prisma.partItem.create({
      data: {
        productId,
        name: data.name,
        location: data.location || null,
        category: data.category,
        quantity: data.quantity,
        unitPriceCents: parseCurrencyToCents(data.unitPriceReais ?? ''),
        notes: data.notes || null,
      },
    });
    revalidatePath(`/admin/produtos/${productId}`);
    return created;
  } catch {
    return { error: 'Não foi possível salvar a peça. Tente novamente.' };
  }
}

export async function updatePartItem(
  id: string,
  productId: string,
  data: PartData,
): Promise<{ error: string } | PartItem> {
  await requireAdmin();
  try {
    const updated = await prisma.partItem.update({
      where: { id },
      data: {
        name: data.name,
        location: data.location || null,
        category: data.category,
        quantity: data.quantity,
        unitPriceCents: parseCurrencyToCents(data.unitPriceReais ?? ''),
        notes: data.notes || null,
      },
    });
    revalidatePath(`/admin/produtos/${productId}`);
    return updated;
  } catch {
    return { error: 'Não foi possível salvar a peça. Tente novamente.' };
  }
}

export async function deletePartItem(
  id: string,
  productId: string,
): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  try {
    await prisma.partItem.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível remover a peça. Tente novamente.' };
  }
  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true as const };
}
