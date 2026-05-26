'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

function parsePrice(value?: string): number {
  if (!value || value.trim() === '') return 0;
  return Math.round(parseFloat(value.replace(',', '.')) * 100);
}

export type PartData = {
  name: string;
  location?: string;
  category: string;
  quantity: number;
  unitPriceReais?: string;
  notes?: string;
};

export async function createPartItem(productId: string, data: PartData) {
  await prisma.partItem.create({
    data: {
      productId,
      name: data.name,
      location: data.location || null,
      category: data.category,
      quantity: data.quantity,
      unitPriceCents: parsePrice(data.unitPriceReais),
      notes: data.notes || null,
    },
  });
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function updatePartItem(id: string, productId: string, data: PartData) {
  await prisma.partItem.update({
    where: { id },
    data: {
      name: data.name,
      location: data.location || null,
      category: data.category,
      quantity: data.quantity,
      unitPriceCents: parsePrice(data.unitPriceReais),
      notes: data.notes || null,
    },
  });
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function deletePartItem(id: string, productId: string) {
  await prisma.partItem.delete({ where: { id } });
  revalidatePath(`/admin/produtos/${productId}`);
}
