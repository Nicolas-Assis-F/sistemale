import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { inputCls, labelCls } from '@/components/admin/costing/ActionForm';
import { summarizeSheets } from '@/lib/domains/costing/service';
import { createSheet } from './_actions';

const pct = (bps: number | null) => (bps == null ? '—' : `${(bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const tone = (bps: number | null) => (bps == null ? 'text-le-muted' : bps < 0 ? 'text-red-600' : bps < 800 ? 'text-amber-700' : 'text-le-success');

export default async function CostingHomePage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const [{ sheets, inputs }, freeProducts, counts] = await Promise.all([
    summarizeSheets(),
    prisma.product.findMany({ where: { costSheet: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    Promise.all([prisma.material.count({ where: { active: true } }), prisma.workCenter.count(), prisma.material.count({ where: { active: true, unitCostCents: 0 } })]),
  ]);
  const [materialCount, processCount, unpriced] = counts;
  const belowMargin = sheets.filter((s) => s.currentMarginBps != null && s.currentMarginBps < inputs.marginBps).length;

  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos" title="Fichas de custo e preço"
        description="Cada produto tem uma ficha: matéria-prima por peso, componentes, mão de obra e serviços. O sistema calcula o custo e sugere o preço pelos impostos e margem configurados." />

      {(materialCount === 0 || processCount === 0) && (
        <div className="rounded-2xl border border-le-blue/25 bg-le-tint p-4 text-sm">
          <p className="font-medium">Primeiros passos</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-le-muted">
            <li className={materialCount ? 'line-through' : ''}><Link href="/admin/custos/materiais" className="text-le-blue">Materiais</Link>: clique em “Cadastrar medidas padrão” e ajuste os preços por kg (ou importe as notas de compra).</li>
            <li className={processCount ? 'line-through' : ''}><Link href="/admin/custos/processos" className="text-le-blue">Processos</Link>: serra, torno, rosca, solda… com o custo por hora.</li>
            <li><Link href="/admin/custos/config" className="text-le-blue">Impostos e margem</Link>: faturamento 12 meses (Simples), comissão, despesas e margem.</li>
            <li>Crie a ficha abaixo, começando pelos subconjuntos (ex.: tool joint) e depois o produto que os usa (ex.: haste).</li>
          </ol>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Fichas', String(sheets.length)],
          ['Produtos sem ficha', String(freeProducts.length)],
          ['Abaixo da margem desejada', String(belowMargin)],
          ['Materiais sem preço', String(unpriced)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-le-line bg-white p-4">
            <p className="text-xs text-le-muted">{label}</p>
            <p className="mt-1 font-heading text-2xl font-medium">{value}</p>
          </div>
        ))}
      </div>

      <form action={createSheet} className="grid gap-3 rounded-2xl border border-le-line bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className={labelCls}>Ficha de um produto da vitrine
          <select name="productId" defaultValue="" className={inputCls}>
            <option value="">— nenhum (subconjunto) —</option>
            {freeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className={labelCls}>…ou nome do subconjunto
          <input name="name" placeholder='Ex.: Tool joint 3 1/2" IF' className={inputCls} />
        </label>
        <button type="submit" className="h-9 self-end rounded-lg bg-le-blue px-4 text-sm font-semibold text-white">Criar ficha</button>
      </form>

      <div role="region" aria-label="Tabela de fichas e preços" tabIndex={0} className="le-cost-table rounded-2xl border border-le-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-le-muted">
            <tr className="border-b border-le-line">
              <th scope="col" className="p-3 font-medium">Ficha</th>
              <th scope="col" className="p-3 text-right font-medium">Aço</th>
              <th scope="col" className="p-3 text-right font-medium">Custo un.</th>
              <th scope="col" className="p-3 text-right font-medium">Preço sugerido</th>
              <th scope="col" className="p-3 text-right font-medium">Preço atual</th>
              <th scope="col" className="p-3 text-right font-medium">Margem atual</th>
              <th scope="col" className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-le-line">
            {sheets.map((s) => (
              <tr key={s.id}>
                <td className="p-3">
                  <Link href={`/admin/custos/fichas/${s.id}`} className="font-medium hover:text-le-blue">{s.name}</Link>
                  <p className="text-xs text-le-muted">{s.product ? s.product.name : 'subconjunto'}{s.result.warnings.length ? <span className="ml-2 text-amber-700">· {s.result.warnings.length} pendência(s)</span> : ''}</p>
                </td>
                <td className="p-3 text-right tabular-nums text-le-muted">{s.result.kgPerUnit ? `${s.result.kgPerUnit.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—'}</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(s.result.unitCents)}</td>
                <td className="p-3 text-right font-semibold tabular-nums text-le-blue">{s.suggestedCents ? formatCurrency(s.suggestedCents) : '—'}</td>
                <td className="p-3 text-right tabular-nums">{s.product ? (s.product.priceCents ? formatCurrency(s.product.priceCents) : 'sob cotação') : '—'}</td>
                <td className={`p-3 text-right font-semibold tabular-nums ${tone(s.currentMarginBps)}`}>{pct(s.currentMarginBps)}</td>
                <td className="p-3 text-right"><Link href={`/admin/custos/fichas/${s.id}`} className="text-xs font-medium text-le-blue">Abrir</Link></td>
              </tr>
            ))}
            {!sheets.length && <tr><td colSpan={7} className="p-8 text-center text-le-muted">Nenhuma ficha ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-le-muted">Margem atual = lucro líquido do preço da vitrine depois de custo, impostos (DAS {pct(inputs.dasBps)}), comissão, taxa e despesas fixas. Meta: {pct(inputs.marginBps)}.</p>
    </div>
  );
}
