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

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({ where: { id } });
  revalidatePath('/admin/funcionarios');
}
