'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { parsePercentToBps } from '@/lib/finance-labels';
import { requireAdmin } from '@/lib/auth';

const employeeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120),
  role: z.string().max(120).optional().or(z.literal('')),
  active: z.string().transform((v) => v === 'true'),
  phone: z.string().max(30).optional().or(z.literal('')),
  pixKey: z.string().max(140).optional().or(z.literal('')),
  commission: z.string().optional().or(z.literal('')),
});

function toData(data: z.infer<typeof employeeSchema>) {
  const bps = data.commission ? parsePercentToBps(data.commission) : 0;
  return {
    name: data.name,
    role: data.role || null,
    active: data.active,
    phone: data.phone || null,
    pixKey: data.pixKey || null,
    commissionBps: bps ?? 0,
  };
}

export async function createEmployee(formData: FormData) {
  await requireAdmin();
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  if (data.commission && parsePercentToBps(data.commission) === null) return { error: { commission: ['Percentual inválido'] } };
  await prisma.employee.create({ data: toData(data) });
  revalidatePath('/admin/funcionarios');
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/funcionarios');
}

export async function updateEmployee(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  if (data.commission && parsePercentToBps(data.commission) === null) return { error: { commission: ['Percentual inválido'] } };
  await prisma.employee.update({ where: { id }, data: toData(data) });
  revalidatePath('/admin/funcionarios');
  if (formData.get('_presentation') === 'sheet') return { ok: true as const };
  redirect('/admin/funcionarios');
}

export async function deleteEmployee(id: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const [orderCount, commissionCount] = await Promise.all([
    prisma.order.count({ where: { employeeId: id } }),
    prisma.commission.count({ where: { employeeId: id } }),
  ]);
  if (orderCount > 0 || commissionCount > 0) {
    return { error: `Não é possível excluir: há pedidos ou comissões vinculados. Marque como inativo.` };
  }
  try {
    await prisma.employee.delete({ where: { id } });
  } catch {
    return { error: 'Não foi possível excluir o funcionário. Tente novamente.' };
  }
  revalidatePath('/admin/funcionarios');
  return { ok: true as const };
}
