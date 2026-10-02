import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { todayStartBR } from '@/lib/finance/summary';
import { centsToCurrencyInput, formatCurrency } from '@/lib/format';
import { pieceRatePay } from '@/lib/production/rules';
import { getUnpaid } from '@/lib/production/service';
import { Field, Panel, ProductionNav, fieldClass } from '@/components/admin/production/ProductionNav';
import { SubmitButton } from '@/components/admin/production/SubmitButton';
import { payEmployee, saveTeamMember } from '../_actions';

export default async function ProductionPayPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const flash = await searchParams;
  const weekAgo = new Date(todayStartBR().getTime() - 6 * 86_400_000);
  const [employees, unpaid, weekWelded, weekHelped, payouts] = await Promise.all([
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true, pieceRateCents: true, markLetter: true } }),
    getUnpaid(),
    prisma.rod.groupBy({ by: ['welderId'], where: { status: 'APROVADA', approvedAt: { gte: weekAgo } }, _count: { _all: true } }),
    prisma.rod.groupBy({ by: ['helperId'], where: { status: 'APROVADA', approvedAt: { gte: weekAgo }, helperId: { not: null } }, _count: { _all: true } }),
    prisma.productionPayout.findMany({ orderBy: { createdAt: 'desc' }, take: 15, include: { employee: { select: { name: true } }, financeEntry: { select: { status: true } } } }),
  ]);
  const week = new Map<string, number>();
  for (const w of weekWelded) week.set(w.welderId, (week.get(w.welderId) ?? 0) + w._count._all);
  for (const h of weekHelped) week.set(h.helperId!, (week.get(h.helperId!) ?? 0) + h._count._all);
  // Equipe da produção primeiro; demais funcionários ficam recolhidos.
  const crew = employees.filter((e) => e.pieceRateCents > 0 || e.markLetter || unpaid.has(e.id));
  const others = employees.filter((e) => !crew.includes(e));

  const memberRow = (e: (typeof employees)[number]) => {
    const due = unpaid.get(e.id) ?? { welded: 0, helped: 0 };
    const amount = pieceRatePay(due.welded, due.helped, e.pieceRateCents);
    return (
      <li key={e.id} className="grid gap-3 py-4 lg:grid-cols-[1.2fr_1.6fr_1.4fr] lg:items-end">
        <div>
          <p className="font-medium text-le-ink">{e.name}{e.markLetter && <span className="ml-2 rounded-md bg-le-tint px-1.5 py-0.5 font-mono text-xs text-le-blue">{e.markLetter}</span>}</p>
          <p className="text-xs text-le-muted">{e.role || 'Sem função'} · {week.get(e.id) ?? 0} aprovada(s) nos últimos 7 dias</p>
        </div>
        <form action={saveTeamMember.bind(null, e.id)} className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
          <Field label="R$ por haste aprovada"><input name="rate" inputMode="decimal" defaultValue={e.pieceRateCents ? centsToCurrencyInput(e.pieceRateCents) : ''} placeholder="20,00" className={fieldClass} /></Field>
          <Field label="Letra"><input name="markLetter" maxLength={1} defaultValue={e.markLetter ?? ''} placeholder="S" className={`${fieldClass} text-center uppercase`} /></Field>
          <SubmitButton variant="outline">Salvar</SubmitButton>
        </form>
        <form action={payEmployee.bind(null, e.id)} className="flex items-end justify-between gap-3 rounded-xl bg-le-tint/50 p-3">
          <div className="text-sm">
            <p className="text-xs text-le-muted">A pagar ({due.welded} soldada{due.welded === 1 ? '' : 's'}{due.helped ? ` + ${due.helped} ajudando` : ''})</p>
            <p className="font-heading text-xl font-medium tabular-nums text-le-ink">{formatCurrency(amount)}</p>
          </div>
          {due.welded + due.helped > 0 && <SubmitButton variant="dark">Fechar pagamento</SubmitButton>}
        </form>
      </li>
    );
  };

  return (
    <div className="le-admin-page">
      <ProductionNav active="/admin/producao/pagamentos" title="Equipe e pagamentos" flash={flash}
        description="Pagamento por produção: cada haste APROVADA paga o soldador e o ajudante uma vez. Retrabalho não paga de novo; refugo não paga." />

      <Panel title="Equipe da produção" hint="A letra vai gravada na haste junto com a data (ex.: 021026S). Fechar pagamento lança a despesa em Financeiro → contas a pagar.">
        {crew.length === 0 && <p className="text-sm text-le-muted">Defina o valor por haste e a letra do soldador e do ajudante abaixo. Quem tiver valor ou letra aparece aqui.</p>}
        <ul className="divide-y divide-le-line/60">{crew.map(memberRow)}</ul>
        {others.length > 0 && (
          <details className="mt-2 border-t border-le-line pt-3">
            <summary className="cursor-pointer text-sm font-medium text-le-blue">Outros funcionários ({others.length})</summary>
            <ul className="divide-y divide-le-line/60">{others.map(memberRow)}</ul>
          </details>
        )}
        {employees.length === 0 && <p className="text-sm text-le-muted">Nenhum funcionário ativo. Cadastre em <Link href="/admin/funcionarios" className="text-le-blue underline">Funcionários</Link>.</p>}
      </Panel>

      <Panel title="Pagamentos fechados">
        {payouts.length === 0 ? <p className="text-sm text-le-muted">Nenhum pagamento fechado ainda.</p> : (
          <ul className="divide-y divide-le-line/60 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="font-medium text-le-ink">{p.employee.name}</p>
                  <p className="text-xs text-le-muted">{p.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {p.welded + p.helped} haste(s) × {formatCurrency(p.rateCents)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(p.amountCents)}</p>
                  <Link href="/admin/financeiro" className="text-xs text-le-blue">{p.financeEntry?.status === 'PAGO' ? 'Pago' : 'Em aberto no Financeiro'}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
