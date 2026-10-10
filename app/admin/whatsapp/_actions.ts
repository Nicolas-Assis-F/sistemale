'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseCurrencyToCents } from '@/lib/format';
import { NEGOTIATING_STAGES, NOT_PROSPECT_KINDS, greetingName, SEGMENTS, normalizePhone, renderTemplate } from '@/lib/leads/rules';

function back(path: string, message: string, kind: 'ok' | 'erro' = 'ok'): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}
const refresh = () => revalidatePath('/admin/whatsapp', 'layout');
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos';
const text = (max: number) => z.string().max(max).optional().transform((v) => v?.trim() || null);
const day = z.string().optional().transform((v) => (v ? new Date(`${v}T12:00:00-03:00`) : null));

export async function createLead(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({
    name: z.string().trim().min(2, 'Informe o nome'),
    phone: z.string().transform(normalizePhone).refine((p) => p.length >= 12 && p.length <= 13, 'Telefone com DDD, ex.: 62 99999-9999'),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back('/admin/whatsapp', firstError(parsed.error), 'erro');
  const existing = await prisma.lead.findUnique({ where: { phone: parsed.data.phone }, select: { id: true } });
  if (existing) redirect(`/admin/whatsapp/${existing.id}?erro=${encodeURIComponent('Esse telefone já estava cadastrado')}`);
  const lead = await prisma.lead.create({ data: { ...parsed.data, source: 'manual' } });
  refresh();
  redirect(`/admin/whatsapp/${lead.id}?ok=${encodeURIComponent('Contato criado')}`);
}

export async function updateLead(id: string, formData: FormData) {
  await requireAdmin();
  const path = `/admin/whatsapp/${id}`;
  const parsed = z.object({
    name: z.string().trim().min(2, 'Informe o nome'),
    kind: text(40), city: text(80), stage: text(40),
    temperature: z.enum(['QUENTE', 'MORNO', 'FRIO', '']).optional().transform((v) => v || null),
    isCustomer: z.string().optional().transform((v) => v === 'on'),
    segments: z.array(z.string()).transform((list) => list.filter((s) => s in SEGMENTS)),
    equipment: text(500), nextStep: text(500), notes: text(4000),
  }).safeParse({ ...Object.fromEntries(formData), segments: formData.getAll('segments').map(String) });
  if (!parsed.success) back(path, firstError(parsed.error), 'erro');
  await prisma.lead.update({ where: { id }, data: parsed.data });
  refresh();
  back(path, 'Ficha salva');
}

export async function addPurchase(leadId: string, formData: FormData) {
  await requireAdmin();
  const path = `/admin/whatsapp/${leadId}`;
  const parsed = z.object({ item: z.string().trim().min(2, 'Descreva o que comprou'), qty: text(40), amount: z.string().optional(), date: day, note: text(300) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(path, firstError(parsed.error), 'erro');
  const { amount, ...rest } = parsed.data;
  await prisma.$transaction([
    prisma.leadPurchase.create({ data: { leadId, ...rest, amountCents: amount ? parseCurrencyToCents(amount) : null, source: 'manual' } }),
    prisma.lead.update({ where: { id: leadId }, data: { isCustomer: true } }),
  ]);
  refresh();
  back(path, 'Compra registrada');
}

export async function deletePurchase(leadId: string, purchaseId: string) {
  await requireAdmin();
  await prisma.leadPurchase.deleteMany({ where: { id: purchaseId, leadId } });
  refresh();
  back(`/admin/whatsapp/${leadId}`, 'Compra removida');
}

export async function addReceivable(leadId: string, formData: FormData) {
  await requireAdmin();
  const path = `/admin/whatsapp/${leadId}`;
  const parsed = z.object({
    description: z.string().trim().min(2, 'Descreva a parcela'),
    amount: z.string().transform(parseCurrencyToCents).refine((c) => c > 0, 'Informe o valor'),
    dueDate: day,
    count: z.string().optional().transform((v) => Math.min(Math.max(Number(v) || 1, 1), 24)),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(path, firstError(parsed.error), 'erro');
  const { description, amount, dueDate, count } = parsed.data;
  // Várias parcelas iguais: vencimento mês a mês a partir da primeira data.
  const rows = Array.from({ length: count }, (_, i) => {
    const due = dueDate ? new Date(dueDate) : null;
    if (due) due.setMonth(due.getMonth() + i);
    return { leadId, description: count > 1 ? `${description} (${i + 1}/${count})` : description, amountCents: amount, dueDate: due, source: 'manual' };
  });
  await prisma.leadReceivable.createMany({ data: rows });
  refresh();
  back(path, count > 1 ? `${count} parcelas lançadas` : 'Parcela lançada');
}

export async function toggleReceivablePaid(leadId: string, receivableId: string, returnTo?: string) {
  await requireAdmin();
  const r = await prisma.leadReceivable.findFirst({ where: { id: receivableId, leadId }, select: { paidAt: true } });
  if (!r) back(returnTo ?? `/admin/whatsapp/${leadId}`, 'Parcela não encontrada', 'erro');
  await prisma.leadReceivable.update({ where: { id: receivableId }, data: { paidAt: r.paidAt ? null : new Date() } });
  refresh();
  back(returnTo ?? `/admin/whatsapp/${leadId}`, r.paidAt ? 'Parcela voltou para em aberto' : 'Parcela marcada como paga');
}

export async function deleteReceivable(leadId: string, receivableId: string) {
  await requireAdmin();
  await prisma.leadReceivable.deleteMany({ where: { id: receivableId, leadId } });
  refresh();
  back(`/admin/whatsapp/${leadId}`, 'Parcela removida');
}

const CAMPAIGN_PATH = '/admin/whatsapp/disparos';

export async function createCampaign(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({
    name: z.string().trim().min(3, 'Dê um nome para a campanha'),
    segment: z.string().refine((s) => s === 'todos' || s in SEGMENTS, 'Escolha o produto'),
    template: z.string().max(3000).optional().transform((v) => v?.trim() || ''),
    temperatures: z.array(z.enum(['QUENTE', 'MORNO', 'FRIO', 'SEM'])).min(1, 'Marque pelo menos um nível de interesse'),
    includeCustomers: z.string().optional().transform((v) => v === 'on'),
    onlyUnsaved: z.string().optional().transform((v) => v === 'on'),
    includeNegotiating: z.string().optional().transform((v) => v === 'on'),
    cooldownDays: z.string().optional().transform((v) => Math.min(Math.max(Number(v) || 0, 0), 365)),
    limit: z.string().optional().transform((v) => Math.min(Math.max(Number(v) || 100, 1), 500)),
  }).safeParse({ ...Object.fromEntries(formData), temperatures: formData.getAll('temperatures').map(String) });
  if (!parsed.success) back(CAMPAIGN_PATH, firstError(parsed.error), 'erro');
  const f = parsed.data;
  const template = f.template || (f.segment === 'todos' ? SEGMENTS.outros.template : SEGMENTS[f.segment as keyof typeof SEGMENTS].template);
  if (!template.includes('{nome}') && template.length < 10) back(CAMPAIGN_PATH, 'Escreva a mensagem', 'erro');
  const since = new Date(Date.now() - f.cooldownDays * 86_400_000);
  const temps = f.temperatures.filter((t) => t !== 'SEM') as ('QUENTE' | 'MORNO' | 'FRIO')[];
  const leads = await prisma.lead.findMany({
    where: {
      AND: [
        { OR: [{ kind: null }, { kind: { notIn: NOT_PROSPECT_KINDS } }] },
        f.segment === 'todos' ? {} : { segments: { has: f.segment } },
        { OR: [{ temperature: { in: temps } }, ...(f.temperatures.includes('SEM') ? [{ temperature: null }] : [])] },
        f.includeCustomers ? {} : { isCustomer: false },
        f.onlyUnsaved ? { savedName: null } : {},
        // Quem pediu preço ou está negociando recebe conversa sua, não promoção genérica.
        f.includeNegotiating ? {} : { OR: [{ stage: null }, { stage: { notIn: NEGOTIATING_STAGES } }] },
        f.cooldownDays ? { dispatches: { none: { createdAt: { gte: since }, status: { not: 'PULADO' } } } } : {},
      ],
    },
    // Quem falou mais recentemente primeiro: maior chance de resposta.
    orderBy: [{ temperature: 'asc' }, { lastMessageAt: { sort: 'desc', nulls: 'last' } }],
    take: f.limit,
    select: { id: true, name: true, pushName: true },
  });
  if (leads.length === 0) back(CAMPAIGN_PATH, 'Nenhum contato com esses filtros', 'erro');
  const campaign = await prisma.leadCampaign.create({
    data: {
      name: f.name, template,
      filter: { segment: f.segment, temperatures: f.temperatures, includeCustomers: f.includeCustomers, onlyUnsaved: f.onlyUnsaved, includeNegotiating: f.includeNegotiating, cooldownDays: f.cooldownDays, limit: f.limit },
      dispatches: { create: leads.map((l) => ({ leadId: l.id, message: renderTemplate(template, greetingName(l)) })) },
    },
  });
  refresh();
  redirect(`${CAMPAIGN_PATH}/${campaign.id}?ok=${encodeURIComponent(`${leads.length} contato(s) na fila`)}`);
}

/** Chamado pelo botão "Abrir no WhatsApp": a pessoa envia no próprio WhatsApp. */
export async function markDispatchSent(dispatchId: string) {
  await requireAdmin();
  await prisma.leadDispatch.updateMany({ where: { id: dispatchId, status: 'PENDENTE' }, data: { status: 'ENVIADO', sentAt: new Date() } });
  refresh();
}

export async function setDispatchStatus(campaignId: string, dispatchId: string, status: 'PULADO' | 'PENDENTE' | 'RESPONDEU') {
  await requireAdmin();
  await prisma.leadDispatch.updateMany({
    where: { id: dispatchId, campaignId },
    data: status === 'PENDENTE' ? { status, sentAt: null, repliedAt: null } : status === 'RESPONDEU' ? { status, repliedAt: new Date() } : { status },
  });
  refresh();
  back(`${CAMPAIGN_PATH}/${campaignId}`, { PULADO: 'Contato pulado', PENDENTE: 'Voltou para a fila', RESPONDEU: 'Marcado como respondeu' }[status]);
}

export async function deleteCampaign(campaignId: string) {
  await requireAdmin();
  await prisma.leadCampaign.delete({ where: { id: campaignId } });
  refresh();
  back(CAMPAIGN_PATH, 'Campanha excluída');
}
