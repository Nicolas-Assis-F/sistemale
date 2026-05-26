'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export async function createPurchaseList(name: string, itemIds: string[]) {
  if (!name.trim()) throw new Error('Nome da lista é obrigatório');
  if (itemIds.length === 0) throw new Error('Selecione pelo menos um item');

  const list = await prisma.purchaseList.create({
    data: {
      name: name.trim(),
      items: {
        create: itemIds.map((partItemId) => ({ partItemId })),
      },
    },
  });

  revalidatePath('/admin/lista-compras');
  redirect(`/admin/lista-compras/${list.id}`);
}

export async function deletePurchaseList(id: string) {
  await prisma.purchaseList.delete({ where: { id } });
  revalidatePath('/admin/lista-compras');
}

export async function renamePurchaseList(id: string, name: string) {
  if (!name.trim()) throw new Error('Nome inválido');
  await prisma.purchaseList.update({
    where: { id },
    data: { name: name.trim() },
  });
  revalidatePath('/admin/lista-compras');
  revalidatePath(`/admin/lista-compras/${id}`);
}
