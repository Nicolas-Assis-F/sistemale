'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

const homeSchema = z.object({
  heroEyebrow: z.string(),
  heroTitle: z.string().min(1),
  heroHighlight: z.string(),
  heroSubtitle: z.string(),
  ctaTitle: z.string().min(1),
  ctaSubtitle: z.string(),
});

const sobreSchema = z.object({
  heroEyebrow: z.string(),
  heroTitle: z.string().min(1),
  heroSubtitle: z.string(),
  story: z.string(),
  stats: z.array(z.object({ label: z.string(), value: z.string() })),
  values: z.array(z.object({ title: z.string(), description: z.string() })),
});

const servicosSchema = z.object({
  heroEyebrow: z.string(),
  heroTitle: z.string().min(1),
  heroSubtitle: z.string(),
  steps: z.array(z.object({ title: z.string(), description: z.string() })),
});

const contatoSchema = z.object({
  heroEyebrow: z.string(),
  heroTitle: z.string().min(1),
  heroSubtitle: z.string(),
  hours: z.string(),
});

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  home: homeSchema,
  sobre: sobreSchema,
  servicos: servicosSchema,
  contato: contatoSchema,
};

const PATHS: Record<string, string> = {
  home: '/',
  sobre: '/sobre',
  servicos: '/servicos',
  contato: '/contato',
};

export async function saveSiteContent(key: string, formData: FormData) {
  const schema = SCHEMAS[key];
  if (!schema) return { error: { _: ['Seção inválida'] } };

  const rawJson = formData.get('payload');
  if (typeof rawJson !== 'string') return { error: { _: ['Dados ausentes'] } };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    return { error: { _: ['JSON inválido'] } };
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) return { error: result.error.flatten().fieldErrors };

  const value = result.data as Prisma.InputJsonValue;
  await prisma.siteContent.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  revalidateTag('site-content', 'max');
  revalidatePath(PATHS[key] ?? '/');
  revalidatePath('/admin/conteudo');
  redirect('/admin/conteudo');
}
