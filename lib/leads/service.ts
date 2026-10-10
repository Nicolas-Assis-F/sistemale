import type { LeadTemperature, PrismaClient } from '@prisma/client';
import { nextDispatchState } from './rules';

/** Um contato como sai da leitura das conversas (data/crm/leads.json). */
export interface LeadImport {
  phone: string;
  name: string;
  savedName?: string | null;
  pushName?: string | null;
  suggestedName?: string | null;
  kind?: string | null;
  isCustomer?: boolean;
  city?: string | null;
  temperature?: LeadTemperature | null;
  stage?: string | null;
  segments?: string[];
  equipment?: string | null;
  interests?: string[];
  objections?: string | null;
  summary?: string | null;
  nextStep?: string | null;
  pendingOrder?: string | null;
  balanceNote?: string | null;
  source?: string;
  purchases?: { item: string; qty?: string | null; amountCents?: number | null; date?: string | null; note?: string | null }[];
  receivables?: { description: string; amountCents: number; dueDate?: string | null; paidAt?: string | null }[];
}

export interface ChatActivity {
  phone: string;
  savedName?: string | null;
  pushName?: string | null;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  lastMessageAt?: string | null;
  lastMessage?: string | null;
}

const date = (v?: string | null) => (v ? new Date(v) : null);

/**
 * Grava a leitura das conversas. Anotações manuais, parcelas já existentes e
 * compras lançadas à mão são preservadas; compras importadas são substituídas.
 */
export async function importLeads(prisma: PrismaClient, leads: LeadImport[]) {
  let created = 0;
  let updated = 0;
  for (const l of leads) {
    const data = {
      name: l.name, savedName: l.savedName ?? null, pushName: l.pushName ?? null, suggestedName: l.suggestedName ?? null,
      kind: l.kind ?? null, isCustomer: l.isCustomer ?? false, city: l.city ?? null, temperature: l.temperature ?? null,
      stage: l.stage ?? null, segments: l.segments ?? [], equipment: l.equipment ?? null, interests: l.interests ?? [],
      objections: l.objections ?? null, summary: l.summary ?? null, nextStep: l.nextStep ?? null,
      pendingOrder: l.pendingOrder ?? null, balanceNote: l.balanceNote ?? null, source: l.source ?? 'whatsapp',
    };
    await prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findUnique({ where: { phone: l.phone }, select: { id: true, _count: { select: { receivables: true } } } });
      const lead = existing
        ? await tx.lead.update({ where: { id: existing.id }, data })
        : await tx.lead.create({ data: { phone: l.phone, ...data } });
      existing ? updated++ : created++;
      await tx.leadPurchase.deleteMany({ where: { leadId: lead.id, source: 'whatsapp' } });
      if (l.purchases?.length) {
        await tx.leadPurchase.createMany({ data: l.purchases.map((p) => ({
          leadId: lead.id, item: p.item, qty: p.qty ?? null, amountCents: p.amountCents ?? null, date: date(p.date), note: p.note ?? null,
        })) });
      }
      if (!existing?._count.receivables && l.receivables?.length) {
        await tx.leadReceivable.createMany({ data: l.receivables.map((r) => ({
          leadId: lead.id, description: r.description, amountCents: r.amountCents, dueDate: date(r.dueDate), paidAt: date(r.paidAt),
        })) });
      }
    });
  }
  return { created, updated };
}

/** Atualiza última conversa de cada contato e o status dos disparos (enviado/respondeu). */
export async function syncActivity(prisma: PrismaClient, chats: ChatActivity[]) {
  const byPhone = new Map(chats.map((c) => [c.phone, c]));
  const leads = await prisma.lead.findMany({
    select: { id: true, phone: true, dispatches: { where: { status: { in: ['PENDENTE', 'ENVIADO'] } }, select: { id: true, status: true, createdAt: true, sentAt: true } } },
  });
  let touched = 0;
  let sent = 0;
  let replied = 0;
  for (const lead of leads) {
    const c = byPhone.get(lead.phone);
    if (!c) continue;
    const activity = { lastInboundAt: date(c.lastInboundAt), lastOutboundAt: date(c.lastOutboundAt) };
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...activity, lastMessageAt: date(c.lastMessageAt), lastMessage: c.lastMessage ?? null,
        ...(c.savedName ? { savedName: c.savedName } : {}), ...(c.pushName ? { pushName: c.pushName } : {}),
      },
    });
    touched++;
    for (const d of lead.dispatches) {
      const next = nextDispatchState(d, activity);
      if (!next) continue;
      await prisma.leadDispatch.update({
        where: { id: d.id },
        data: { ...next, reply: next.status === 'RESPONDEU' && !c.lastMessage?.startsWith('Você:') ? c.lastMessage : undefined },
      });
      next.status === 'RESPONDEU' ? replied++ : sent++;
    }
  }
  return { touched, sent, replied };
}
