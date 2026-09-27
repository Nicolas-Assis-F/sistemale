'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function createPurchaseList(name: string, itemIds: string[]) {
  await requireAdmin();
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

export async function deletePurchaseList(id: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  try {
    await prisma.purchaseList.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir a lista. Tente novamente.' };
  }
  revalidatePath('/admin/lista-compras');
  return { ok: true as const };
}

export async function renamePurchaseList(id: string, name: string) {
  await requireAdmin();
  if (!name.trim()) throw new Error('Nome inválido');
  await prisma.purchaseList.update({
    where: { id },
    data: { name: name.trim() },
  });
  revalidatePath('/admin/lista-compras');
  revalidatePath(`/admin/lista-compras/${id}`);
}
