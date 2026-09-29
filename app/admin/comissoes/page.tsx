import Link from 'next/link';
import type { CommissionStatus, Prisma } from '@prisma/client';
import { BadgePercent, Clock, HandCoins, Wallet } from 'lucide-react';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import {
  COMMISSION_ROLE_LABELS, COMMISSION_STATUS_BADGE, COMMISSION_STATUS_LABELS, formatBps,
} from '@/lib/finance-labels';
import { PayCommissionsButton } from '@/components/admin/commissions/PayCommissionsButton';
import { cn } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth';

const TABS: { value: string; label: string; status?: CommissionStatus }[] = [
  { value: 'apagar', label: 'A pagar', status: 'LIBERADA' },
  { value: 'pendentes', label: 'Aguardando pedido', status: 'PENDENTE' },
  { value: 'pagas', label: 'Pagas', status: 'PAGA' },
  { value: 'todas', label: 'Todas' },
];

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ aba?: string; funcionario?: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { aba = 'apagar', funcionario } = await searchParams;
  const tab = TABS.find((t) => t.value === aba) ?? TABS[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const where: Prisma.CommissionWhereInput = {
    ...(tab.status ? { status: tab.status } : { status: { not: 'CANCELADA' } }),
    ...(funcionario ? { employeeId: funcionario } : {}),
  };

  const [employees, sums, paidThisMonth, rows, payouts] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, role: true, pixKey: true, commissionBps: true, active: true } }),
    prisma.commission.groupBy({ by: ['employeeId', 'status'], _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.commissionPayout.groupBy({ by: ['employeeId'], where: { paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
    prisma.commission.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        employee: { select: { name: true } },
        order: { select: { id: true, number: true, status: true, customer: { select: { name: true } } } },
      },
    }),
    prisma.commissionPayout.findMany({ orderBy: { paidAt: 'desc' }, take: 10, include: { employee: { select: { name: true } }, _count: { select: { commissions: true } } } }),
  ]);

  const sumOf = (employeeId: string | null, status: CommissionStatus) =>
    sums.filter((s) => (!employeeId || s.employeeId === employeeId) && s.status === status).reduce((t, s) => t + (s._sum.amountCents ?? 0), 0);
  const countOf = (employeeId: string, status: CommissionStatus) =>
    sums.find((s) => s.employeeId === employeeId && s.status === status)?._count._all ?? 0;
  const paidMonth = (employeeId: string | null) =>
    paidThisMonth.filter((p) => !employeeId || p.employeeId === employeeId).reduce((t, p) => t + (p._sum.amountCents ?? 0), 0);

  const withActivity = employees.filter((e) => e.active || sums.some((s) => s.employeeId === e.id));
  const kpis = [
    { label: 'A pagar agora', value: sumOf(null, 'LIBERADA'), icon: HandCoins, hint: 'Pedidos quitados' },
    { label: 'Aguardando pagamento do pedido', value: sumOf(null, 'PENDENTE'), icon: Clock, hint: 'Liberam na quitação' },
    { label: 'Pago neste mês', value: paidMonth(null), icon: Wallet, hint: monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) },
  ];

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { aba, funcionario, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/comissoes?${p}`;
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 p-5 lg:p-10">
      <div>
        <p className="le-kicker">Operação / comissões</p>
        <h1 className="mt-3 font-heading text-3xl font-medium tracking-[-.05em]">Comissões da equipe</h1>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-le-muted">
          Cada comissão é um percentual sobre o total do pedido. Ela fica <strong>pendente</strong> até o pedido ser quitado, vira <strong>a pagar</strong> na quitação (ou quando liberada manualmente) e sai do saldo quando você registra o pagamento ao funcionário.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="rounded-2xl border border-le-line bg-white p-5">
            <div className="flex items-center justify-between text-xs text-le-muted">{label}<Icon className="h-4 w-4 text-le-blue" /></div>
            <p className="mt-3 font-heading text-3xl font-semibold tracking-tight">{formatCurrency(value)}</p>
            <p className="mt-1 text-[11px] capitalize text-le-muted">{hint}</p>
          </div>
        ))}
      </div>

      {/* Por funcionário */}
      <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
        <header className="flex items-center justify-between border-b border-le-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><BadgePercent className="h-4 w-4 text-le-blue" /> Por funcionário</h2>
          <Link href="/admin/funcionarios" className="text-xs text-le-blue hover:underline">Gerenciar funcionários</Link>
        </header>
        {withActivity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-le-muted">Cadastre funcionários com percentual de comissão para começar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="le-responsive-table w-full  text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-le-muted">
                <tr className="border-b border-le-line">
                  <th className="px-5 py-3 font-medium">Funcionário</th>
                  <th className="px-3 py-3 font-medium">Padrão</th>
                  <th className="px-3 py-3 text-right font-medium">Pendente</th>
                  <th className="px-3 py-3 text-right font-medium">A pagar</th>
                  <th className="px-3 py-3 text-right font-medium">Pago no mês</th>
                  <th className="px-5 py-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-le-line">
                {withActivity.map((e) => (
                  <tr key={e.id} className={cn('hover:bg-le-subtle', funcionario === e.id && 'bg-le-subtle')}>
                    <td data-label="Funcionário" className="px-5 py-3.5">
                      <Link href={qs({ funcionario: funcionario === e.id ? undefined : e.id })} className="font-medium hover:text-le-blue">{e.name}</Link>
                      <p className="text-[11px] text-le-muted">{e.role || '—'}{!e.active && ' · inativo'}{!e.pixKey && ' · sem chave PIX'}</p>
                    </td>
                    <td data-label="Padrão" className="px-3 py-3.5 text-xs text-le-muted">{e.commissionBps ? formatBps(e.commissionBps) : '—'}</td>
                    <td data-label="Pendente" className="px-3 py-3.5 text-right text-le-muted">{formatCurrency(sumOf(e.id, 'PENDENTE'))}</td>
                    <td data-label="A pagar" className="px-3 py-3.5 text-right font-semibold text-amber-700">{formatCurrency(sumOf(e.id, 'LIBERADA'))}</td>
                    <td data-label="Pago no mês" className="px-3 py-3.5 text-right text-emerald-700">{formatCurrency(paidMonth(e.id))}</td>
                    <td data-label="Ação" className="px-5 py-3.5 text-right">
                      <PayCommissionsButton
                        employeeId={e.id}
                        employeeName={e.name}
                        amountCents={sumOf(e.id, 'LIBERADA')}
                        count={countOf(e.id, 'LIBERADA')}
                        pixKey={e.pixKey}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Lançamentos */}
      <section className="overflow-hidden rounded-2xl border border-le-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-le-line p-4">
          <div className="flex gap-1 rounded-xl bg-le-subtle p-1">
            {TABS.map((t) => (
              <Link key={t.value} href={qs({ aba: t.value })} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', t.value === tab.value ? 'bg-white text-le-text shadow-sm' : 'text-le-muted hover:text-le-text')}>
                {t.label}
              </Link>
            ))}
          </div>
          {funcionario && (
            <Link href={qs({ funcionario: undefined })} className="text-xs text-le-blue hover:underline">
              Mostrando: {employees.find((e) => e.id === funcionario)?.name} · limpar
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="le-responsive-table w-full  text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-le-muted">
              <tr className="border-b border-le-line">
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-3 py-3 font-medium">Funcionário</th>
                <th className="px-3 py-3 font-medium">Função</th>
                <th className="px-3 py-3 text-right font-medium">Base</th>
                <th className="px-3 py-3 text-right font-medium">%</th>
                <th className="px-3 py-3 text-right font-medium">Comissão</th>
                <th className="px-5 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-le-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-le-subtle">
                  <td data-label="Pedido" className="px-5 py-3">
                    <Link href={`/admin/pedidos/${c.order.id}`} className="font-mono text-xs font-semibold hover:text-le-blue">{c.order.number}</Link>
                    <p className="text-[11px] text-le-muted">{c.order.customer.name}</p>
                  </td>
                  <td data-label="Funcionário" className="px-3 py-3">{c.employee.name}</td>
                  <td data-label="Função" className="px-3 py-3 text-xs text-le-muted">{COMMISSION_ROLE_LABELS[c.role]}</td>
                  <td data-label="Base" className="px-3 py-3 text-right text-xs text-le-muted">{formatCurrency(c.baseCents)}</td>
                  <td data-label="%" className="px-3 py-3 text-right text-xs">{formatBps(c.bps)}</td>
                  <td data-label="Comissão" className="px-3 py-3 text-right font-semibold">{formatCurrency(c.amountCents)}</td>
                  <td data-label="Situação" className="px-5 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', COMMISSION_STATUS_BADGE[c.status])}>{COMMISSION_STATUS_LABELS[c.status]}</span>
                    <p className="mt-0.5 text-[11px] text-le-muted">
                      {c.paidAt ? `paga ${c.paidAt.toLocaleDateString('pt-BR')}` : c.releasedAt ? `liberada ${c.releasedAt.toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-le-muted">Nada nesta seleção.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {payouts.length > 0 && (
        <section className="rounded-2xl border border-le-line bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Últimos pagamentos à equipe</h2>
          <ul className="divide-y divide-le-line text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong className="font-medium">{p.employee.name}</strong> · {p._count.commissions} comissão(ões){p.method ? ` · ${p.method}` : ''}{p.notes ? ` · ${p.notes}` : ''}</span>
                <span className="text-xs text-le-muted">{formatCurrency(p.amountCents)} em {p.paidAt.toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
