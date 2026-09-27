'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FinanceType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency, parseCurrencyToCents } from '@/lib/format';
import { CATEGORY_BY_KEY, competenceLabel, earnsSalary, shiftCompetence } from '@/lib/finance-categories';

type Result = { ok: true; message?: string } | { error: string };

function refresh() {
  revalidatePath('/admin/financeiro');
  revalidatePath('/admin');
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const entrySchema = z.object({
  type: z.nativeEnum(FinanceType),
  category: z.string().min(1, 'Escolha a categoria'),
  description: z.string().trim().min(2, 'Descreva o lançamento').max(200),
  amount: z.string().min(1, 'Informe o valor'),
  dueDate: z.string().regex(dateRe, 'Informe o vencimento'),
  competence: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal('')),
  paid: z.string().optional(),
  paidAt: z.string().regex(dateRe).optional().or(z.literal('')),
  method: opt(40),
  account: opt(40),
  supplier: opt(120),
  document: opt(60),
  notes: opt(1000),
  employeeId: opt(40),
  repeat: z.coerce.number().int().min(1).max(36).default(1),
});

const at = (d: string) => new Date(`${d}T12:00:00-03:00`);
function addMonths(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  const last = new Date(y, m - 1 + n + 1, 0).getDate(); // último dia do mês alvo
  const t = new Date(y, m - 1 + n, Math.min(d, last));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Cria (com repetição mensal opcional) ou edita um lançamento. */
export async function saveFinanceEntry(id: string | null, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revise os campos.' };
  const d = parsed.data;
  const cat = CATEGORY_BY_KEY[d.category];
  if (!cat || cat.type !== d.type) return { error: 'Categoria incompatível com o tipo.' };
  const amountCents = parseCurrencyToCents(d.amount);
  if (amountCents <= 0) return { error: 'Informe um valor maior que zero.' };
  const paid = d.paid === 'true';
  const paidAt = paid ? at(d.paidAt || d.dueDate) : null;

  const base = {
    type: d.type,
    category: d.category,
    description: d.description,
    amountCents,
    method: d.method || null,
    account: d.account || null,
    supplier: d.supplier || null,
    document: d.document || null,
    notes: d.notes || null,
    employeeId: d.employeeId || null,
  };

  if (id) {
    const current = await prisma.financeEntry.findUnique({ where: { id } });
    if (!current) return { error: 'Lançamento não encontrado.' };
    if (current.payoutId) return { error: 'Lançamento gerado pelo pagamento de comissões: edite pela aba Comissões.' };
    await prisma.financeEntry.update({
      where: { id },
      data: { ...base, dueDate: at(d.dueDate), competence: d.competence || d.dueDate.slice(0, 7), status: paid ? 'PAGO' : 'PREVISTO', paidAt },
    });
    refresh();
    return { ok: true, message: 'Lançamento atualizado.' };
  }

  const group = d.repeat > 1 ? crypto.randomUUID() : null;
  await prisma.financeEntry.createMany({
    data: Array.from({ length: d.repeat }, (_, i) => {
      const due = addMonths(d.dueDate, i);
      return {
        ...base,
        description: d.repeat > 1 ? `${d.description} (${i + 1}/${d.repeat})` : d.description,
        dueDate: at(due),
        competence: i === 0 && d.competence ? d.competence : due.slice(0, 7),
        // só o primeiro pode nascer pago
        status: i === 0 && paid ? ('PAGO' as const) : ('PREVISTO' as const),
        paidAt: i === 0 ? paidAt : null,
        recurrenceGroup: group,
      };
    }),
  });
  refresh();
  return { ok: true, message: d.repeat > 1 ? `${d.repeat} lançamentos mensais criados.` : 'Lançamento criado.' };
}

const paySchema = z.object({
  paidAt: z.string().regex(dateRe, 'Informe a data'),
  method: opt(40),
  account: opt(40),
  amount: z.string().optional().or(z.literal('')),
});

/** Dá baixa (pago/recebido), com valor final opcional (juros, desconto). */
export async function markEntryPaid(id: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = paySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const e = await prisma.financeEntry.findUnique({ where: { id } });
  if (!e || e.status !== 'PREVISTO') return { error: 'Só lançamentos em aberto podem receber baixa.' };
  const amountCents = parsed.data.amount ? parseCurrencyToCents(parsed.data.amount) : e.amountCents;
  if (amountCents <= 0) return { error: 'Valor inválido.' };
  await prisma.financeEntry.update({
    where: { id },
    data: {
      status: 'PAGO', paidAt: at(parsed.data.paidAt), amountCents,
      method: parsed.data.method || e.method, account: parsed.data.account || e.account,
    },
  });
  refresh();
  return { ok: true, message: e.type === 'DESPESA' ? 'Pagamento registrado.' : 'Recebimento registrado.' };
}

/** Estorna a baixa (volta para em aberto). */
export async function reopenEntry(id: string): Promise<Result> {
  await requireAdmin();
  const e = await prisma.financeEntry.findUnique({ where: { id } });
  if (!e || e.status !== 'PAGO') return { error: 'Lançamento não está pago.' };
  if (e.payoutId) return { error: 'Pagamento de comissões não pode ser reaberto por aqui.' };
  await prisma.financeEntry.update({ where: { id }, data: { status: 'PREVISTO', paidAt: null } });
  refresh();
  return { ok: true, message: 'Baixa desfeita.' };
}

/** Cancela (mantém histórico) — ou todos os futuros da mesma recorrência. */
export async function cancelEntry(id: string, scope: 'one' | 'future' = 'one'): Promise<Result> {
  await requireAdmin();
  const e = await prisma.financeEntry.findUnique({ where: { id } });
  if (!e) return { error: 'Lançamento não encontrado.' };
  if (e.payoutId) return { error: 'Lançamento vinculado a pagamento de comissões.' };
  if (scope === 'future' && e.recurrenceGroup) {
    const r = await prisma.financeEntry.updateMany({
      where: { recurrenceGroup: e.recurrenceGroup, status: 'PREVISTO', dueDate: { gte: e.dueDate } },
      data: { status: 'CANCELADO' },
    });
    refresh();
    return { ok: true, message: `${r.count} lançamento(s) cancelado(s).` };
  }
  await prisma.financeEntry.update({ where: { id }, data: { status: 'CANCELADO' } });
  refresh();
  return { ok: true, message: 'Lançamento cancelado.' };
}

/**
 * Gera a folha do mês: um lançamento "Salários" em aberto por funcionário
 * ativo com salário (não duplica). Vence no dia de pagamento do mês seguinte.
 */
export async function generatePayroll(competence: string): Promise<Result> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}$/.test(competence)) return { error: 'Competência inválida.' };
  const employees = await prisma.employee.findMany({ where: { active: true, salaryCents: { gt: 0 } } });
  const eligible = employees.filter((e) => earnsSalary(e.payType));
  if (!eligible.length) return { error: 'Nenhum funcionário ativo com salário cadastrado.' };

  const existing = await prisma.financeEntry.findMany({
    where: { category: 'SALARIOS', competence, status: { not: 'CANCELADO' }, employeeId: { in: eligible.map((e) => e.id) } },
    select: { employeeId: true },
  });
  const done = new Set(existing.map((e) => e.employeeId));
  const next = shiftCompetence(competence, 1);
  const toCreate = eligible.filter((e) => !done.has(e.id));
  if (!toCreate.length) return { ok: true, message: 'A folha deste mês já foi gerada.' };

  await prisma.financeEntry.createMany({
    data: toCreate.map((e) => ({
      type: 'DESPESA' as const,
      category: 'SALARIOS',
      description: `Salário ${competenceLabel(competence)} — ${e.name}`,
      amountCents: e.salaryCents,
      competence,
      dueDate: at(`${next}-${String(Math.min(Math.max(e.payDay, 1), 28)).padStart(2, '0')}`),
      employeeId: e.id,
      method: 'PIX',
    })),
  });
  refresh();
  const total = toCreate.reduce((s, e) => s + e.salaryCents, 0);
  return { ok: true, message: `Folha gerada: ${toCreate.length} funcionário(s) · ${formatCurrency(total)}.` };
}
