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

/** Limites anti-spam (sem guardar IP): por e-mail e no total do site. */
const PER_EMAIL_PER_HOUR = 3;
const SITE_PER_10_MIN = 30;

export async function submitContact(formData: FormData) {
  // Campo-armadilha invisível: gente não preenche, robô preenche. Finge sucesso.
  if (String(formData.get('website') ?? '').trim()) return { ok: true as const };
  const raw = Object.fromEntries(formData);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const [byEmail, recent] = await Promise.all([
    prisma.contactSubmission.count({ where: { email: data.email, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } }),
    prisma.contactSubmission.count({ where: { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } }),
  ]);
  if (byEmail >= PER_EMAIL_PER_HOUR || recent >= SITE_PER_10_MIN) {
    return { ok: false as const, error: { message: ['Recebemos muitas mensagens agora. Tente de novo em alguns minutos ou fale pelo WhatsApp.'] } };
  }
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
