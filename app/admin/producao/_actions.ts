'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseCurrencyToCents, formatCurrency } from '@/lib/format';
import { CUT_PLANS, DEFECTS, ROD_LENGTHS, diameterLabel, isDiameter, rodLabel } from '@/lib/production/rules';
import {
  adjustTo, approveRods, closePayout, inspectRod, registerCut, registerEntry, registerWeld,
} from '@/lib/production/service';

const diameter = z.string().refine(isDiameter, 'Diâmetro inválido');
const qty = z.string().transform(Number).pipe(z.number().int().min(1, 'Quantidade mínima 1').max(500));
const length = z.string().transform(Number).pipe(z.number().refine((n) => (ROD_LENGTHS as readonly number[]).includes(n), 'Comprimento inválido'));
const optionalId = z.string().optional().transform((v) => v || null);

/** Volta para a tela com uma mensagem (funciona igual no celular, sem JS extra). */
function back(path: string, message: string, kind: 'ok' | 'erro' = 'ok'): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function refresh(stockChanged = false) {
  revalidatePath('/admin/producao', 'layout');
  if (stockChanged) {
    revalidateTag('products', 'max');
    revalidatePath('/admin/produtos');
  }
}

const firstError = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos';

export async function addEntry(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ kind: z.enum(['TUBO', 'PAR']), diameter, qty, note: z.string().max(200).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/producao', firstError(parsed.error), 'erro');
  const { kind, diameter: d, qty: n, note } = parsed.data;
  await registerEntry(kind, d, n, note);
  refresh();
  back('/admin/producao', kind === 'TUBO' ? `${n} tubo(s) de ${diameterLabel(d)} lançados` : `${n} par(es) recebidos no galpão`);
}

export async function addCut(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ diameter, plan: z.enum(CUT_PLANS), tubes: qty, employeeId: optionalId }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/producao', firstError(parsed.error), 'erro');
  await registerCut(parsed.data);
  refresh();
  back('/admin/producao', `Corte lançado: ${parsed.data.tubes} tubo(s) em ${parsed.data.plan}`);
}

export async function addWeld(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({
    diameter, lengthM: length, qty, welderId: z.string().min(1, 'Escolha o soldador'), helperId: optionalId,
    weldedOn: z.string().optional().transform((v) => (v ? new Date(`${v}T12:00:00-03:00`) : undefined))
      .refine((d) => !d || (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86_400_000), 'Data da solda inválida'),
  })
    .refine((v) => v.helperId !== v.welderId, 'Soldador e ajudante precisam ser pessoas diferentes')
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/producao', firstError(parsed.error), 'erro');
  const r = await registerWeld(parsed.data);
  refresh();
  back('/admin/producao', `${parsed.data.qty} haste(s) ${rodLabel(parsed.data.diameter, parsed.data.lengthM)} para inspeção · marca ${r.mark}`);
}

export async function adjustBalance(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({
    kind: z.enum(['TUBO', 'PAR', 'PECA']), diameter, lengthM: z.string().optional().transform((v) => Number(v || 0)),
    counted: z.string().transform(Number).pipe(z.number().int().min(0).max(10_000)),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/producao', firstError(parsed.error), 'erro');
  const { kind, diameter: d, lengthM, counted } = parsed.data;
  const diff = await adjustTo(kind, d, kind === 'PECA' ? lengthM : 0, counted);
  refresh();
  back('/admin/producao', diff === 0 ? 'Contagem confere com o sistema' : `Saldo ajustado (${diff > 0 ? '+' : ''}${diff})`);
}

export async function approveSelected(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  if (ids.length === 0) back('/admin/producao/inspecao', 'Marque pelo menos uma haste', 'erro');
  const n = await approveRods(ids);
  refresh(true);
  back('/admin/producao/inspecao', `${n} haste(s) aprovada(s) e somadas ao estoque do site`);
}

export async function inspectOne(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = z.object({
    result: z.enum(['APROVADA', 'RETRABALHO', 'REFUGO']),
    defect: z.enum(DEFECTS).optional().or(z.literal('')),
    measuredMm: z.string().optional().transform((v) => (v ? Number(v.replace(/\D/g, '')) : null)),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/producao/inspecao', firstError(parsed.error), 'erro');
  const result = await inspectRod(id, parsed.data);
  refresh(result === 'APROVADA');
  const label = { APROVADA: 'aprovada', RETRABALHO: 'enviada para retrabalho', REFUGO: 'refugada' }[result];
  back('/admin/producao/inspecao', parsed.data.result === 'APROVADA' && result !== 'APROVADA'
    ? 'Comprimento fora de ±5 mm: haste enviada para retrabalho' : `Haste ${label}`, result === 'APROVADA' ? 'ok' : 'erro');
}

export async function saveTeamMember(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = z.object({
    rate: z.string().optional(),
    markLetter: z.string().max(1).regex(/^[A-Za-z]?$/, 'Use uma letra').optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/producao/pagamentos', firstError(parsed.error), 'erro');
  const letter = parsed.data.markLetter?.toUpperCase() || null;
  if (letter) {
    const clash = await prisma.employee.findFirst({ where: { markLetter: letter, id: { not: id } }, select: { name: true } });
    if (clash) back('/admin/producao/pagamentos', `A letra ${letter} já é de ${clash.name}`, 'erro');
  }
  await prisma.employee.update({ where: { id }, data: { pieceRateCents: parseCurrencyToCents(parsed.data.rate ?? ''), markLetter: letter } });
  refresh();
  back('/admin/producao/pagamentos', 'Equipe atualizada');
}

export async function payEmployee(id: string) {
  await requireAdmin();
  let message: string;
  try {
    const payout = await closePayout(id);
    message = payout ? `Pagamento fechado: ${formatCurrency(payout.amountCents)} lançado no Financeiro` : 'Nada a pagar para esta pessoa';
  } catch (error) {
    back('/admin/producao/pagamentos', error instanceof Error ? error.message : 'Não foi possível fechar o pagamento', 'erro');
  }
  refresh();
  revalidatePath('/admin/financeiro');
  back('/admin/producao/pagamentos', message);
}
