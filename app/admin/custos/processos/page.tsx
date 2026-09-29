import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { ActionButton, ActionForm, inputCls, labelCls } from '@/components/admin/costing/ActionForm';
import { LaborCalculator } from '@/components/admin/costing/LaborCalculator';
import { deleteWorkCenter, saveWorkCenter } from '../_actions';

const SUGGESTED = ['Serra (corte)', 'Torno CNC', 'Torno convencional', 'Rosqueamento', 'Fresadora', 'Solda', 'Montagem', 'Pintura'];

export default async function WorkCentersPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { editar } = await searchParams;
  const [centers, salaries] = await Promise.all([
    prisma.workCenter.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { lines: true } } } }),
    prisma.employee.aggregate({ where: { active: true, salaryCents: { gt: 0 } }, _avg: { salaryCents: true } }),
  ]);
  const editing = editar ? centers.find((c) => c.id === editar) : undefined;
  const missing = SUGGESTED.filter((s) => !centers.some((c) => c.name.toLowerCase() === s.toLowerCase()));

  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos/processos" title="Processos e mão de obra"
        description="Cada processo tem um custo por hora (operador + máquina). Nas fichas você informa os minutos de cada etapa e o sistema calcula." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-3">
          <h2 className="font-heading text-base font-medium">{editing ? `Editar: ${editing.name}` : 'Novo processo'}</h2>
          <ActionForm key={editing?.id ?? 'novo'} action={saveWorkCenter.bind(null, editing?.id ?? null)} resetOnSuccess={!editing}
            className="grid gap-3 rounded-2xl border border-le-line bg-white p-4 sm:grid-cols-3">
            <label className={`${labelCls} sm:col-span-2`}>Nome
              <input name="name" required defaultValue={editing?.name ?? ''} list="processos-sugeridos" placeholder="Torno CNC" className={inputCls} />
              <datalist id="processos-sugeridos">{missing.map((s) => <option key={s} value={s} />)}</datalist>
            </label>
            <label className={labelCls}>Custo por hora (R$)
              <input name="rate" required defaultValue={editing ? (editing.rateCentsPerHour / 100).toFixed(2).replace('.', ',') : ''} inputMode="decimal" placeholder="85,00" className={inputCls} />
            </label>
            <label className={`${labelCls} sm:col-span-3`}>Observação
              <input name="notes" defaultValue={editing?.notes ?? ''} placeholder="Ex.: inclui operador + energia + ferramental" className={inputCls} />
            </label>
            <div className="flex items-center justify-end gap-3 sm:col-span-3">
              {editing && <Link href="/admin/custos/processos" className="text-sm text-le-muted">Cancelar</Link>}
              <button type="submit" className="h-9 rounded-lg bg-le-blue px-4 text-sm font-semibold text-white">{editing ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </ActionForm>

          <div className="overflow-hidden rounded-2xl border border-le-line bg-white">
            {centers.length ? (
              <ul className="divide-y divide-le-line">
                {centers.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.name}</p>
                      <p className="truncate text-xs text-le-muted">{c.notes || `${c._count.lines} uso(s) em fichas`}</p>
                    </div>
                    <p className={`tabular-nums ${c.rateCentsPerHour ? '' : 'font-semibold text-amber-700'}`}>{c.rateCentsPerHour ? `${formatCurrency(c.rateCentsPerHour)}/h` : 'sem custo'}</p>
                    <Link href={`/admin/custos/processos?editar=${c.id}`} className="text-xs font-medium text-le-blue">Editar</Link>
                    <ActionButton action={deleteWorkCenter.bind(null, c.id)} confirm={`Excluir "${c.name}"?`} className="text-xs text-le-muted hover:text-red-600">Excluir</ActionButton>
                  </li>
                ))}
              </ul>
            ) : <p className="p-6 text-center text-sm text-le-muted">Cadastre os processos da oficina: {SUGGESTED.slice(0, 5).join(', ')}…</p>}
          </div>
        </section>
        <LaborCalculator avgSalaryCents={Math.round(salaries._avg.salaryCents ?? 0)} />
      </div>
    </div>
  );
}
