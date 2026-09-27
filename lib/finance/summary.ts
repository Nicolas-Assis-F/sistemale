// Consultas do financeiro (server-only). Recebimentos de pedidos vêm de Payment;
// demais receitas/despesas vêm de FinanceEntry — nunca duplicados.
import { prisma } from '@/lib/db';
import { PAID_STATUSES } from '@/lib/orders/ledger';
import { CATEGORY_BY_KEY, shiftCompetence } from '@/lib/finance-categories';

/** Limites do mês no fuso de Brasília (-03:00, sem horário de verão desde 2019). */
export function monthRange(competence: string) {
  const start = new Date(`${competence}-01T00:00:00-03:00`);
  const end = new Date(`${shiftCompetence(competence, 1)}-01T00:00:00-03:00`);
  return { start, end };
}

export function todayStartBR() {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return new Date(`${d}T00:00:00-03:00`);
}

export async function getMonthSummary(competence: string) {
  const { start, end } = monthRange(competence);
  const today = todayStartBR();
  const trendStart = monthRange(shiftCompetence(competence, -5)).start;

  const [orderPaid, orderOpen, entries, overdueEntries, overdueOrderPayments, trendPayments, trendEntries] = await Promise.all([
    // Recebido de pedidos no mês (caixa)
    prisma.payment.findMany({
      where: { status: { in: PAID_STATUSES }, paidAt: { gte: start, lt: end } },
      orderBy: { paidAt: 'desc' },
      select: { id: true, amountCents: true, netCents: true, method: true, provider: true, paidAt: true, order: { select: { id: true, number: true, customer: { select: { name: true } } } } },
    }),
    // A receber de pedidos com vencimento no mês
    prisma.payment.findMany({
      where: { status: { in: ['PENDENTE', 'VENCIDO'] }, dueDate: { gte: start, lt: end }, order: { status: { not: 'CANCELADO' } } },
      orderBy: { dueDate: 'asc' },
      select: { id: true, amountCents: true, method: true, dueDate: true, status: true, order: { select: { id: true, number: true, customer: { select: { name: true } } } } },
    }),
    // Lançamentos do mês: pagos no mês OU em aberto com vencimento no mês
    prisma.financeEntry.findMany({
      where: {
        status: { not: 'CANCELADO' },
        OR: [{ status: 'PAGO', paidAt: { gte: start, lt: end } }, { status: 'PREVISTO', dueDate: { gte: start, lt: end } }],
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { employee: { select: { name: true } }, order: { select: { id: true, number: true } } },
    }),
    prisma.financeEntry.findMany({
      where: { status: 'PREVISTO', dueDate: { lt: today } },
      orderBy: { dueDate: 'asc' },
      take: 20,
      select: { id: true, type: true, description: true, amountCents: true, dueDate: true, category: true },
    }),
    prisma.payment.aggregate({
      where: { order: { status: { not: 'CANCELADO' } }, OR: [{ status: 'VENCIDO' }, { status: 'PENDENTE', dueDate: { lt: today } }] },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.findMany({ where: { status: { in: PAID_STATUSES }, paidAt: { gte: trendStart, lt: end } }, select: { amountCents: true, paidAt: true } }),
    prisma.financeEntry.findMany({ where: { status: 'PAGO', paidAt: { gte: trendStart, lt: end } }, select: { type: true, amountCents: true, paidAt: true } }),
  ]);

  const sum = (xs: { amountCents: number }[]) => xs.reduce((t, x) => t + x.amountCents, 0);
  const paid = entries.filter((e) => e.status === 'PAGO');
  const open = entries.filter((e) => e.status === 'PREVISTO');

  const income = sum(orderPaid) + sum(paid.filter((e) => e.type === 'RECEITA'));
  const expense = sum(paid.filter((e) => e.type === 'DESPESA'));
  const toReceive = sum(orderOpen) + sum(open.filter((e) => e.type === 'RECEITA'));
  const toPay = sum(open.filter((e) => e.type === 'DESPESA'));

  // Despesas do mês por categoria (pagas + em aberto)
  const byCategory = new Map<string, { paid: number; open: number }>();
  for (const e of entries.filter((x) => x.type === 'DESPESA')) {
    const row = byCategory.get(e.category) ?? { paid: 0, open: 0 };
    if (e.status === 'PAGO') row.paid += e.amountCents; else row.open += e.amountCents;
    byCategory.set(e.category, row);
  }
  const categories = [...byCategory.entries()]
    .map(([key, v]) => ({ key, label: CATEGORY_BY_KEY[key]?.label ?? key, group: CATEGORY_BY_KEY[key]?.group ?? 'OPERACAO', ...v, total: v.paid + v.open }))
    .sort((a, b) => b.total - a.total);

  // Tendência: 6 meses de caixa realizado
  const bucket = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(d).slice(0, 7);
  const trend = Array.from({ length: 6 }, (_, i) => shiftCompetence(competence, i - 5)).map((c) => ({ competence: c, income: 0, expense: 0 }));
  const byComp = Object.fromEntries(trend.map((t) => [t.competence, t]));
  for (const p of trendPayments) if (p.paidAt) byComp[bucket(p.paidAt)] && (byComp[bucket(p.paidAt)].income += p.amountCents);
  for (const e of trendEntries) if (e.paidAt && byComp[bucket(e.paidAt)]) {
    if (e.type === 'RECEITA') byComp[bucket(e.paidAt)].income += e.amountCents; else byComp[bucket(e.paidAt)].expense += e.amountCents;
  }

  return {
    competence,
    totals: { income, expense, result: income - expense, toReceive, toPay },
    overdue: {
      entries: overdueEntries,
      payablesCents: sum(overdueEntries.filter((e) => e.type === 'DESPESA')),
      receivablesCents: (overdueOrderPayments._sum.amountCents ?? 0) + sum(overdueEntries.filter((e) => e.type === 'RECEITA')),
      orderPaymentsCount: overdueOrderPayments._count,
    },
    orderPaid,
    orderOpen,
    entries,
    categories,
    trend,
  };
}

export type MonthSummary = Awaited<ReturnType<typeof getMonthSummary>>;
