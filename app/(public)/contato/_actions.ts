'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const contactSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120),
  email: z.string().email('E-mail inválido').max(160),
  phone: z.string().max(40).optional().or(z.literal('')),
  subject: z.string().max(160).optional().or(z.literal('')),
  message: z.string().min(1, 'Mensagem obrigatória').max(4000),
});

export async function submitContact(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.contactSubmission.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message,
    },
  });

  revalidateTag('contact-submissions', 'max');
  revalidatePath('/admin');
  return { ok: true as const };
}
