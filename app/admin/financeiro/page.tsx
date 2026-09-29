import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Scale, Wallet } from 'lucide-react';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { getMonthSummary, monthRange, todayStartBR } from '@/lib/finance/summary';
import {
  FINANCE_STATUS_LABELS, GROUP_LABELS, PAY_TYPE_LABELS, categoryLabel, competenceLabel,
  currentCompetence, earnsSalary, shiftCompetence,
} from '@/lib/finance-categories';
import { PAYMENT_METHOD_LABELS } from '@/lib/finance-labels';
import { EntryRowActions, EntrySheetButton, GeneratePayrollButton } from '@/components/admin/finance/FinanceControls';
import { cn } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth';

const TABS = [
  { key: 'visao', label: 'Visão geral' },
  { key: 'lancamentos', label: 'Lançamentos' },
  { key: 'equipe', label: 'Folha e equipe' },
] as const;

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const isoDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string; aba?: string; tipo?: string; status?: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const sp = await searchParams;
  const competence = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : currentCompetence();
  const tab = TABS.find((t) => t.key === sp.aba)?.key ?? 'visao';
  const label = competenceLabel(competence);

  const [summary, employees] = await Promise.all([
    getMonthSummary(competence),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true, payType: true, salaryCents: true, commissionBps: true, payDay: true } }),
  ]);
  const { totals, overdue } = summary;
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { mes: competence, aba: tab, tipo: sp.tipo, status: sp.status, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/financeiro?${p}`;
  };
  const defaultDue = competence === currentCompetence() ? isoDate(new Date()) : `${competence}-10`;
  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-10">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="le-kicker">Gestão / financeiro</p>
          <h1 className="mt-3 font-heading text-3xl font-medium tracking-[-.05em]">Financeiro da empresa</h1>
          <p className="mt-2 text-xs text-le-muted">Caixa realizado, contas a pagar e a receber, folha e comissões — tudo por mês.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-le-line bg-white p-1">
            <Link href={href({ mes: shiftCompetence(competence, -1) })} aria-label="Mês anterior" className="rounded-lg p-2 text-le-muted hover:bg-le-subtle hover:text-le-text"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="min-w-36 text-center text-sm font-semibold">{label}</span>
            <Link href={href({ mes: shiftCompetence(competence, 1) })} aria-label="Próximo mês" className="rounded-lg p-2 text-le-muted hover:bg-le-subtle hover:text-le-text"><ChevronRight className="h-4 w-4" /></Link>
          </div>
          <a href={`/api/financeiro/csv?mes=${competence}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-le-line bg-white px-3 text-sm font-medium text-le-text hover:border-le-blue-border hover:text-le-blue">
            <Download className="h-4 w-4" /> CSV p/ contador
          </a>
          <EntrySheetButton employees={employeeOptions} defaults={{ type: 'DESPESA', category: 'MATERIA_PRIMA', description: '', amountCents: 0, dueDate: defaultDue }} />
        </div>
      </div>

      {/* KPIs do mês */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Entradas (recebido)', value: totals.income, icon: ArrowDownRight, tone: 'text-le-success' },
          { label: 'Saídas (pago)', value: totals.expense, icon: ArrowUpRight, tone: 'text-le-danger' },
          { label: 'Resultado do mês', value: totals.result, icon: Scale, tone: totals.result >= 0 ? 'text-le-success' : 'text-le-danger' },
          { label: 'A receber no mês', value: totals.toReceive, icon: Wallet, tone: 'text-le-blue' },
          { label: 'A pagar no mês', value: totals.toPay, icon: Wallet, tone: 'text-le-warning' },
        ].map(({ label: l, value, icon: Icon, tone }) => (
          <div key={l} className="rounded-2xl border border-le-line bg-white p-5">
            <div className="flex items-center justify-between text-xs text-le-muted">{l}<Icon className={cn('h-4 w-4', tone)} /></div>
            <p className={cn('mt-3 font-heading text-2xl font-semibold tracking-tight tabular-nums', l === 'Resultado do mês' && tone)}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {(overdue.payablesCents > 0 || overdue.receivablesCents > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-le-danger/25 bg-le-danger-surface px-5 py-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-le-danger" />
          <span className="text-le-text">
            Vencidos: <strong>{formatCurrency(overdue.payablesCents)}</strong> a pagar
            {overdue.receivablesCents > 0 && <> · <strong>{formatCurrency(overdue.receivablesCents)}</strong> a receber ({overdue.orderPaymentsCount} cobrança(s) de pedidos)</>}
          </span>
          <Link href={href({ aba: 'lancamentos', status: 'vencido' })} className="ml-auto text-xs font-semibold text-le-danger hover:underline">Ver vencidos</Link>
        </div>
      )}

      {/* Abas */}
      <nav aria-label="Seções do financeiro" className="flex gap-1 overflow-x-auto rounded-xl bg-le-subtle p-1">
        {TABS.map((t) => (
          <Link key={t.key} href={href({ aba: t.key })} aria-current={tab === t.key ? 'page' : undefined} className={cn('whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium', tab === t.key ? 'bg-white text-le-text shadow-sm' : 'text-le-muted hover:text-le-text')}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'visao' && <Overview summary={summary} competence={competence} />}
      {tab === 'lancamentos' && <Entries summary={summary} employees={employeeOptions} tipo={sp.tipo} status={sp.status} href={href} />}
      {tab === 'equipe' && <Team competence={competence} label={label} employees={employees} />}
    </div>
  );
}

// ─── Visão geral ──────────────────────────────────────────────────────────────

function Overview({ summary, competence }: { summary: Awaited<ReturnType<typeof getMonthSummary>>; competence: string }) {
  const max = Math.max(1, ...summary.trend.flatMap((t) => [t.income, t.expense]));
  const totalExpenses = summary.categories.reduce((s, c) => s + c.total, 0) || 1;
  const groups = Object.entries(
    summary.categories.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.group]: (acc[c.group] ?? 0) + c.paid }), {}),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <section className="rounded-2xl border border-le-line bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Caixa dos últimos 6 meses</h2>
        <p className="text-xs text-le-muted">Entradas e saídas efetivamente realizadas.</p>
        <div className="mt-6 grid h-56 grid-cols-6 items-end gap-3" role="img" aria-label="Gráfico de entradas e saídas por mês">
          {summary.trend.map((t) => (
            <div key={t.competence} className="flex h-full flex-col justify-end gap-2">
              <div className="flex flex-1 items-end justify-center gap-1">
                <span title={`Entradas ${formatCurrency(t.income)}`} className="w-1/2 max-w-7 rounded-t-md bg-le-success/80" style={{ height: `${(t.income / max) * 100}%`, minHeight: t.income ? 4 : 0 }} />
                <span title={`Saídas ${formatCurrency(t.expense)}`} className="w-1/2 max-w-7 rounded-t-md bg-le-danger/70" style={{ height: `${(t.expense / max) * 100}%`, minHeight: t.expense ? 4 : 0 }} />
              </div>
              <span className={cn('text-center text-[11px]', t.competence === competence ? 'font-semibold text-le-text' : 'text-le-muted')}>
                {competenceLabel(t.competence).split(' ')[0].slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-le-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-le-success/80" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-le-danger/70" /> Saídas</span>
        </div>
        <table className="mt-5 w-full text-sm">
          <tbody className="divide-y divide-le-line">
            {summary.trend.map((t) => (
              <tr key={t.competence}>
                <td className="py-2 text-le-muted">{competenceLabel(t.competence)}</td>
                <td className="py-2 text-right tabular-nums text-le-success">{formatCurrency(t.income)}</td>
                <td className="py-2 text-right tabular-nums text-le-danger">{formatCurrency(t.expense)}</td>
                <td className={cn('py-2 text-right font-semibold tabular-nums', t.income - t.expense >= 0 ? 'text-le-text' : 'text-le-danger')}>{formatCurrency(t.income - t.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-le-line bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Resultado do mês (simplificado)</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Recebido de pedidos</dt><dd className="tabular-nums text-le-success">{formatCurrency(summary.orderPaid.reduce((s, p) => s + p.amountCents, 0))}</dd></div>
            <div className="flex justify-between"><dt>Outras receitas</dt><dd className="tabular-nums text-le-success">{formatCurrency(summary.entries.filter((e) => e.type === 'RECEITA' && e.status === 'PAGO').reduce((s, e) => s + e.amountCents, 0))}</dd></div>
            {groups.map(([g, v]) => (
              <div key={g} className="flex justify-between"><dt className="text-le-muted">(−) {GROUP_LABELS[g as keyof typeof GROUP_LABELS]}</dt><dd className="tabular-nums text-le-danger">{formatCurrency(v)}</dd></div>
            ))}
            <div className="flex justify-between border-t border-le-line pt-2 font-semibold"><dt>Resultado</dt><dd className={cn('tabular-nums', summary.totals.result < 0 && 'text-le-danger')}>{formatCurrency(summary.totals.result)}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-le-line bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Despesas por categoria</h2>
          {summary.categories.length === 0 ? (
            <p className="mt-3 text-sm text-le-muted">Nenhuma despesa lançada neste mês.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {summary.categories.slice(0, 8).map((c) => (
                <li key={c.key}>
                  <div className="flex justify-between gap-3 text-xs"><span className="truncate">{c.label}</span><span className="tabular-nums font-semibold">{formatCurrency(c.total)}</span></div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-le-subtle">
                    <span className="bg-le-ink" style={{ width: `${(c.paid / totalExpenses) * 100}%` }} />
                    <span className="bg-le-warning/70" style={{ width: `${(c.open / totalExpenses) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Lançamentos ──────────────────────────────────────────────────────────────

type Row = {
  key: string; kind: 'entry' | 'order';
  type: 'RECEITA' | 'DESPESA'; status: 'PREVISTO' | 'PAGO' | 'CANCELADO' | 'VENCIDO';
  date: Date | null; description: string; category: string; amountCents: number; who?: string | null;
  orderHref?: string; entry?: Awaited<ReturnType<typeof getMonthSummary>>['entries'][number];
};

function Entries({ summary, employees, tipo, status, href }: {
  summary: Awaited<ReturnType<typeof getMonthSummary>>; employees: { id: string; name: string }[]; tipo?: string; status?: string;
  href: (p: Record<string, string | undefined>) => string;
}) {
  const now = todayStartBR();
  const rows: Row[] = [
    ...summary.entries.map((e) => ({
      key: e.id, kind: 'entry' as const, type: e.type,
      status: e.status === 'PREVISTO' && e.dueDate < now ? ('VENCIDO' as const) : e.status,
      date: e.status === 'PAGO' ? e.paidAt : e.dueDate, description: e.description, category: categoryLabel(e.category),
      amountCents: e.amountCents, who: e.employee?.name ?? e.supplier, entry: e,
    })),
    ...summary.orderPaid.map((p) => ({
      key: p.id, kind: 'order' as const, type: 'RECEITA' as const, status: 'PAGO' as const, date: p.paidAt,
      description: `Pedido ${p.order.number} · ${PAYMENT_METHOD_LABELS[p.method]}${p.provider === 'ASAAS' ? ' (Asaas)' : ''}`,
      category: 'Vendas (pedidos)', amountCents: p.amountCents, who: p.order.customer.name, orderHref: `/admin/pedidos/${p.order.id}`,
    })),
    ...summary.orderOpen.map((p) => ({
      key: p.id, kind: 'order' as const, type: 'RECEITA' as const, status: (p.status === 'VENCIDO' || (p.dueDate && p.dueDate < now) ? 'VENCIDO' : 'PREVISTO') as Row['status'],
      date: p.dueDate, description: `Pedido ${p.order.number} · cobrança ${PAYMENT_METHOD_LABELS[p.method]}`, category: 'Vendas (pedidos)',
      amountCents: p.amountCents, who: p.order.customer.name, orderHref: `/admin/pedidos/${p.order.id}`,
    })),
  ]
    .filter((r) => (tipo === 'entradas' ? r.type === 'RECEITA' : tipo === 'saidas' ? r.type === 'DESPESA' : true))
    .filter((r) => (status === 'aberto' ? r.status === 'PREVISTO' || r.status === 'VENCIDO' : status === 'pago' ? r.status === 'PAGO' : status === 'vencido' ? r.status === 'VENCIDO' : true))
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  const total = rows.reduce((s, r) => s + (r.type === 'RECEITA' ? r.amountCents : -r.amountCents), 0);
  const chip = (active: boolean) => cn('rounded-lg px-3 py-1.5 text-xs font-medium', active ? 'bg-le-ink text-white' : 'text-le-muted hover:bg-le-subtle hover:text-le-text');

  return (
    <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-le-line p-4">
        {[['', 'Tudo'], ['entradas', 'Entradas'], ['saidas', 'Saídas']].map(([v, l]) => <Link key={v} href={href({ tipo: v || undefined })} className={chip((tipo ?? '') === v)}>{l}</Link>)}
        <span className="mx-1 h-5 w-px bg-le-line" />
        {[['', 'Qualquer situação'], ['aberto', 'Em aberto'], ['vencido', 'Vencidos'], ['pago', 'Pagos']].map(([v, l]) => <Link key={v} href={href({ status: v || undefined })} className={chip((status ?? '') === v)}>{l}</Link>)}
        <span className="ml-auto text-xs text-le-muted">Saldo da seleção: <strong className={cn('tabular-nums', total < 0 ? 'text-le-danger' : 'text-le-text')}>{formatCurrency(total)}</strong></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-le-muted">
            <tr className="border-b border-le-line">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Descrição</th>
              <th className="px-3 py-3 font-medium">Categoria</th>
              <th className="px-3 py-3 text-right font-medium">Valor</th>
              <th className="px-3 py-3 font-medium">Situação</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-le-line">
            {rows.map((r) => (
              <tr key={r.key} className={cn('hover:bg-le-subtle/60', r.status === 'CANCELADO' && 'opacity-50')}>
                <td className="px-5 py-3 whitespace-nowrap text-xs text-le-muted">{fmtDate(r.date)}</td>
                <td className="px-3 py-3">
                  {r.orderHref ? <Link href={r.orderHref} className="font-medium hover:text-le-blue">{r.description}</Link> : <span className="font-medium">{r.description}</span>}
                  {r.who && <p className="text-xs text-le-muted">{r.who}</p>}
                </td>
                <td className="px-3 py-3 text-xs text-le-muted">{r.category}</td>
                <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', r.type === 'RECEITA' ? 'text-le-success' : 'text-le-text')}>
                  {r.type === 'RECEITA' ? '+' : '−'} {formatCurrency(r.amountCents)}
                </td>
                <td className="px-3 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', {
                    PAGO: 'bg-le-success-surface text-le-success', PREVISTO: 'bg-le-warning-surface text-le-warning', VENCIDO: 'bg-le-danger-surface text-le-danger', CANCELADO: 'bg-le-subtle text-le-muted',
                  }[r.status])}>
                    {r.status === 'VENCIDO' ? 'Vencido' : r.status === 'PAGO' ? (r.type === 'RECEITA' ? 'Recebido' : 'Pago') : FINANCE_STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {r.kind === 'entry' && r.entry ? (
                    <div className="flex items-center justify-end gap-1">
                      {!r.entry.payoutId && r.entry.status !== 'CANCELADO' && (
                        <EntrySheetButton
                          variant="icon"
                          employees={employees}
                          defaults={{
                            id: r.entry.id, type: r.entry.type, category: r.entry.category, description: r.entry.description,
                            amountCents: r.entry.amountCents, dueDate: isoDate(r.entry.dueDate), competence: r.entry.competence,
                            paidAt: r.entry.paidAt ? isoDate(r.entry.paidAt) : null, method: r.entry.method, account: r.entry.account,
                            supplier: r.entry.supplier, document: r.entry.document, notes: r.entry.notes, employeeId: r.entry.employeeId,
                          }}
                        />
                      )}
                      {!r.entry.payoutId && (
                        <EntryRowActions id={r.entry.id} type={r.entry.type} status={r.entry.status} amountCents={r.entry.amountCents} recurring={!!r.entry.recurrenceGroup} method={r.entry.method} account={r.entry.account} />
                      )}
                    </div>
                  ) : (
                    <p className="text-right text-[11px] text-le-muted">{r.status === 'PAGO' ? 'via pedido' : 'cobrança do pedido'}</p>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-le-muted">Nada neste mês com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Folha e equipe ───────────────────────────────────────────────────────────

async function Team({ competence, label, employees }: {
  competence: string; label: string;
  employees: { id: string; name: string; role: string | null; payType: 'SALARIO' | 'COMISSAO' | 'SALARIO_COMISSAO'; salaryCents: number; commissionBps: number; payDay: number }[];
}) {
  const { start, end } = monthRange(competence);
  const [salaryEntries, payouts, pendingCommissions] = await Promise.all([
    prisma.financeEntry.findMany({ where: { category: { in: ['SALARIOS', 'ADIANTAMENTO'] }, competence, status: { not: 'CANCELADO' } }, select: { employeeId: true, category: true, amountCents: true, status: true } }),
    prisma.commissionPayout.groupBy({ by: ['employeeId'], where: { paidAt: { gte: start, lt: end } }, _sum: { amountCents: true } }),
    prisma.commission.groupBy({ by: ['employeeId'], where: { status: 'LIBERADA' }, _sum: { amountCents: true } }),
  ]);
  const salaried = employees.filter((e) => earnsSalary(e.payType) && e.salaryCents > 0);
  const generated = new Set(salaryEntries.filter((e) => e.category === 'SALARIOS').map((e) => e.employeeId));
  const missing = salaried.filter((e) => !generated.has(e.id));

  const rows = employees.map((e) => {
    const salary = salaryEntries.find((s) => s.employeeId === e.id && s.category === 'SALARIOS');
    const advances = salaryEntries.filter((s) => s.employeeId === e.id && s.category === 'ADIANTAMENTO').reduce((t, s) => t + s.amountCents, 0);
    const commissionsPaid = payouts.find((p) => p.employeeId === e.id)?._sum.amountCents ?? 0;
    const commissionsDue = pendingCommissions.find((p) => p.employeeId === e.id)?._sum.amountCents ?? 0;
    return { ...e, salary, advances, commissionsPaid, commissionsDue, cost: (salary?.amountCents ?? (earnsSalary(e.payType) ? e.salaryCents : 0)) + commissionsPaid };
  });
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-le-line p-5">
        <div>
          <h2 className="text-sm font-semibold">Folha de {label.toLowerCase()}</h2>
          <p className="text-xs text-le-muted">Custo de pessoal estimado: <strong className="text-le-text">{formatCurrency(totalCost)}</strong> · salários vencem no dia configurado do mês seguinte.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/comissoes" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-le-blue hover:bg-le-tint">Comissões →</Link>
          <GeneratePayrollButton competence={competence} label={label} count={missing.length} totalCents={missing.reduce((s, e) => s + e.salaryCents, 0)} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-le-muted">
            <tr className="border-b border-le-line">
              <th className="px-5 py-3 font-medium">Funcionário</th>
              <th className="px-3 py-3 font-medium">Remuneração</th>
              <th className="px-3 py-3 text-right font-medium">Salário do mês</th>
              <th className="px-3 py-3 text-right font-medium">Vales</th>
              <th className="px-3 py-3 text-right font-medium">Comissões pagas</th>
              <th className="px-5 py-3 text-right font-medium">Comissões a pagar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-le-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3"><p className="font-medium">{r.name}</p><p className="text-xs text-le-muted">{r.role || '—'}</p></td>
                <td className="px-3 py-3 text-xs text-le-muted">{PAY_TYPE_LABELS[r.payType]}{r.payType !== 'SALARIO' && r.commissionBps ? ` · ${(r.commissionBps / 100).toLocaleString('pt-BR')}%` : ''}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {!earnsSalary(r.payType) ? <span className="text-le-muted">—</span> : r.salary ? (
                    <span>{formatCurrency(r.salary.amountCents)} <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', r.salary.status === 'PAGO' ? 'bg-le-success-surface text-le-success' : 'bg-le-warning-surface text-le-warning')}>{r.salary.status === 'PAGO' ? 'pago' : 'a pagar'}</span></span>
                  ) : r.salaryCents ? <span className="text-le-muted">{formatCurrency(r.salaryCents)} · não gerado</span> : <span className="text-le-warning">sem salário cadastrado</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-le-muted">{r.advances ? formatCurrency(r.advances) : '—'}</td>
                <td className="px-3 py-3 text-right tabular-nums">{r.commissionsPaid ? formatCurrency(r.commissionsPaid) : '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-le-warning">{r.commissionsDue ? formatCurrency(r.commissionsDue) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-le-muted">Cadastre os funcionários com salário ou comissão em <Link href="/admin/funcionarios" className="text-le-blue">Funcionários</Link>.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="border-t border-le-line px-5 py-3 text-xs text-le-muted">
        Vales e adiantamentos: lance em “Novo lançamento” → categoria “Adiantamento / vale”, escolhendo o funcionário. Pagamentos de salário são baixados na aba Lançamentos.
      </p>
    </section>
  );
}

export const dynamic = 'force-dynamic';
