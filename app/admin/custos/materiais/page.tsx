import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { MaterialForm } from '@/components/admin/costing/MaterialForm';
import { ActionButton } from '@/components/admin/costing/ActionForm';
import { kgPerMeter } from '@/lib/domains/costing/steel';
import { deleteMaterial, seedStandardMaterials } from '../_actions';

const KIND_TITLES = { BARRA_REDONDA: 'Barras maciças', TUBO: 'Tubos', COMPONENTE: 'Componentes comprados prontos', SERVICO: 'Serviços terceirizados', INSUMO: 'Insumos' } as const;
const UNIT = { KG: 'kg', M: 'm', UN: 'un' } as const;

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { editar, novo } = await searchParams;
  const materials = await prisma.material.findMany({ where: { active: true }, orderBy: [{ kind: 'asc' }, { name: 'asc' }], include: { _count: { select: { lines: true } } } });
  const editing = editar ? materials.find((m) => m.id === editar) : undefined;
  const groups = (Object.keys(KIND_TITLES) as (keyof typeof KIND_TITLES)[]).map((k) => ({ kind: k, items: materials.filter((m) => m.kind === k) })).filter((g) => g.items.length);

  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos/materiais" title="Materiais"
        description="Matéria-prima (barra e tubo por kg, com peso calculado pela medida), componentes comprados prontos, serviços terceirizados e insumos. O custo aqui alimenta todas as fichas."
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionButton action={seedStandardMaterials} className="h-9 rounded-lg border border-le-line bg-white px-3 text-sm font-medium">Cadastrar medidas padrão</ActionButton>
            <Link href="/admin/custos/materiais?novo=1" className="flex h-9 items-center rounded-lg bg-le-blue px-3 text-sm font-semibold text-white">+ Novo material</Link>
          </div>
        } />

      {(novo || editing) && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">{editing ? `Editar: ${editing.name}` : 'Novo material'}</h2>
            <Link href="/admin/custos/materiais" className="text-sm text-le-muted hover:text-le-text">Fechar</Link>
          </div>
          <MaterialForm key={editing?.id ?? 'novo'} defaults={editing ? {
            id: editing.id, name: editing.name, kind: editing.kind, grade: editing.grade, sizeLabel: editing.sizeLabel,
            diameterMm: editing.diameterMm, wallMm: editing.wallMm, unit: editing.unit,
            unitCost: (editing.unitCostCents / 100).toFixed(2).replace('.', ','), ncm: editing.ncm, supplier: editing.supplier, notes: editing.notes,
          } : undefined} />
        </section>
      )}

      {!materials.length && (
        <div className="rounded-2xl border border-dashed border-le-line p-10 text-center text-sm text-le-muted">
          Nenhum material ainda. Comece por <strong>Cadastrar medidas padrão</strong>: barras SAE 1045 e tubos SCH 40/80 em 2 3/8", 2 7/8" e 3 1/2".
        </div>
      )}

      {groups.map((g) => (
        <section key={g.kind} className="space-y-2">
          <h2 className="font-heading text-base font-medium">{KIND_TITLES[g.kind]}</h2>
          <div className="overflow-x-auto rounded-2xl border border-le-line bg-white">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-le-muted">
                <tr className="border-b border-le-line">
                  <th className="p-3 font-medium">Material</th>
                  {(g.kind === 'BARRA_REDONDA' || g.kind === 'TUBO') && <><th className="p-3 font-medium">Medida</th><th className="p-3 text-right font-medium">kg/m</th></>}
                  <th className="p-3 text-right font-medium">Custo</th>
                  {(g.kind === 'BARRA_REDONDA' || g.kind === 'TUBO') && <th className="p-3 text-right font-medium">R$/m</th>}
                  <th className="p-3 font-medium">Última compra</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-le-line">
                {g.items.map((m) => {
                  const steel = m.kind === 'BARRA_REDONDA' || m.kind === 'TUBO';
                  const kgm = steel ? kgPerMeter(m.kind as 'BARRA_REDONDA' | 'TUBO', m.diameterMm ?? 0, m.wallMm) : 0;
                  return (
                    <tr key={m.id}>
                      <td className="p-3">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-le-muted">{[m.grade, m.ncm && `NCM ${m.ncm}`, m.supplier].filter(Boolean).join(' · ')}</p>
                      </td>
                      {steel && <>
                        <td className="whitespace-nowrap p-3 text-xs text-le-muted">Ø {m.diameterMm?.toLocaleString('pt-BR')} mm{m.wallMm ? ` × ${m.wallMm.toLocaleString('pt-BR')} mm` : ''}</td>
                        <td className="p-3 text-right tabular-nums">{kgm.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                      </>}
                      <td className={`whitespace-nowrap p-3 text-right tabular-nums ${m.unitCostCents ? '' : 'font-semibold text-amber-700'}`}>
                        {m.unitCostCents ? `${formatCurrency(m.unitCostCents)}/${UNIT[m.unit]}` : 'sem preço'}
                      </td>
                      {steel && <td className="p-3 text-right tabular-nums">{m.unit === 'KG' && m.unitCostCents ? formatCurrency(Math.round(kgm * m.unitCostCents)) : '—'}</td>}
                      <td className="p-3 text-xs text-le-muted">{m.lastPurchaseAt ? m.lastPurchaseAt.toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="whitespace-nowrap p-3 text-right">
                        <Link href={`/admin/custos/materiais?editar=${m.id}`} className="mr-3 text-xs font-medium text-le-blue">Editar</Link>
                        <ActionButton action={deleteMaterial.bind(null, m.id)} confirm={`Excluir "${m.name}"?${m._count.lines ? ' Ele está em fichas e será só arquivado.' : ''}`} className="text-xs text-le-muted hover:text-red-600">Excluir</ActionButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
