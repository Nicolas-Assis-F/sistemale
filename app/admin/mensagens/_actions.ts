'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export async function markRead(id: string, read: boolean) {
  await prisma.contactSubmission.update({ where: { id }, data: { read } });
  revalidatePath('/admin');
  revalidatePath('/admin/mensagens');
}

export async function deleteSubmission(id: string) {
  await prisma.contactSubmission.delete({ where: { id } });
  revalidatePath('/admin');
  revalidatePath('/admin/mensagens');
  redirect('/admin/mensagens');
}
