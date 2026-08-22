'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const employeeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120),
  role: z.string().max(120).optional().or(z.literal('')),
  active: z.string().transform((v) => v === 'true'),
});

export async function createEmployee(formData: FormData) {
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  await prisma.employee.create({
    data: { name: data.name, role: data.role || null, active: data.active },
  });
  revalidatePath('/admin/funcionarios');
  redirect('/admin/funcionarios');
}

export async function updateEmployee(id: string, formData: FormData) {
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  await prisma.employee.update({
    where: { id },
    data: { name: data.name, role: data.role || null, active: data.active },
  });
  revalidatePath('/admin/funcionarios');
  redirect('/admin/funcionarios');
}

export async function deleteEmployee(id: string): Promise<{ error: string } | { ok: true }> {
  const orderCount = await prisma.order.count({ where: { employeeId: id } });
  if (orderCount > 0) {
    return { error: `Não é possível excluir: existem ${orderCount} pedido(s) vinculados a este funcionário.` };
  }
  try {
    await prisma.employee.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o funcionário. Tente novamente.' };
  }
  revalidatePath('/admin/funcionarios');
  return { ok: true as const };
}
