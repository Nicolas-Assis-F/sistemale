import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';
import { DEFECTS, INSPECTION_CHECKS, LENGTH_TOLERANCE_MM, rodLabel } from '@/lib/production/rules';
import { Panel, ProductionNav, fieldClass } from '@/components/admin/production/ProductionNav';
import { SubmitButton } from '@/components/admin/production/SubmitButton';
import { CheckAll } from '@/components/admin/production/CheckAll';
import { approveSelected, inspectOne } from '../_actions';

const BULK_FORM = 'aprovar-hastes';

export default async function InspectionPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const flash = await searchParams;
  const [rods, recent] = await Promise.all([
    prisma.rod.findMany({
      where: { status: { in: ['INSPECAO', 'RETRABALHO'] } },
      orderBy: [{ createdAt: 'asc' }, { serial: 'asc' }],
      include: { welder: { select: { name: true } }, helper: { select: { name: true } } },
    }),
    prisma.rod.findMany({
      where: { status: { in: ['APROVADA', 'REFUGO'] }, inspectedAt: { not: null } },
      orderBy: { inspectedAt: 'desc' }, take: 10,
      select: { id: true, serial: true, markCode: true, diameter: true, lengthM: true, status: true, defect: true, inspectedAt: true },
    }),
  ]);
  // Agrupa por marca gravada + medida: é assim que as hastes estão no galpão.
  const groups = new Map<string, typeof rods>();
  for (const r of rods) {
    const key = `${r.markCode}·${r.diameter}·${r.lengthM}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="le-admin-page">
      <ProductionNav active="/admin/producao/inspecao" title="Inspeção" flash={flash}
        description="Só haste aprovada vai para o estoque do site e entra no pagamento por produção." />

      <Panel title="O que conferir em cada haste" hint="Aprovar = tudo isto OK. Se uma falhar, use Reprovar na linha da haste.">
        <ol className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {INSPECTION_CHECKS.map((c, i) => (
            <li key={c} className="flex gap-2 rounded-xl bg-le-tint/60 px-3 py-2"><span className="font-semibold text-le-blue">{i + 1}.</span><span>{c}</span></li>
          ))}
        </ol>
      </Panel>

      {rods.length === 0 ? (
        <Panel title="Fila vazia"><p className="text-sm text-le-muted">Nenhuma haste aguardando inspeção. As soldadas aparecem aqui quando forem lançadas na linha.</p></Panel>
      ) : (
        <>
          <form id={BULK_FORM} action={approveSelected} className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-le-line bg-white/95 p-3 shadow-sm backdrop-blur">
            <p className="text-sm"><strong>{rods.length}</strong> haste(s) na fila. Marque as que passaram em tudo:</p>
            <SubmitButton>Aprovar marcadas</SubmitButton>
          </form>

          {[...groups.entries()].map(([key, list]) => {
            const first = list[0];
            return (
              <Panel key={key} title={`Marca ${first.markCode} · ${rodLabel(first.diameter, first.lengthM)}`}
                hint={`${list.length} haste(s) · soldador ${first.welder.name}${first.helper ? ` · ajudante ${first.helper.name}` : ''}`}>
                <div className="mb-3"><CheckAll group={key} count={list.length} /></div>
                <ul className="divide-y divide-le-line/60">
                  {list.map((r) => (
                    <li key={r.id} className="py-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex min-h-11 flex-1 items-center gap-3 text-sm">
                          <input type="checkbox" name="ids" value={r.id} form={BULK_FORM} data-group={key} className="size-5 accent-(--le-blue)" />
                          <span className="font-mono text-xs text-le-muted">{r.serial}</span>
                          {r.status === 'RETRABALHO' && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Retrabalho: {r.defect}</span>}
                        </label>
                        <details className="group">
                          <summary className="cursor-pointer list-none rounded-lg border border-le-line px-3 py-2 text-xs font-medium text-le-muted hover:text-le-text">Reprovar / medir</summary>
                          <form action={inspectOne.bind(null, r.id)} className="mt-2 grid gap-2 rounded-xl border border-le-line p-3 sm:grid-cols-4">
                            <select name="defect" className={fieldClass} defaultValue="Solda" aria-label="Defeito">
                              {DEFECTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <input name="measuredMm" inputMode="numeric" className={fieldClass} placeholder={`Medida mm (${r.lengthM * 1000} ±${LENGTH_TOLERANCE_MM})`} aria-label="Comprimento medido em mm" />
                            <select name="result" className={fieldClass} defaultValue="RETRABALHO" aria-label="Resultado">
                              <option value="RETRABALHO">Retrabalho</option>
                              <option value="REFUGO">Refugo (perdida)</option>
                              <option value="APROVADA">Aprovar com medida</option>
                            </select>
                            <SubmitButton variant="outline">Gravar</SubmitButton>
                          </form>
                        </details>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </>
      )}

      {recent.length > 0 && (
        <Panel title="Últimas inspecionadas">
          <ul className="divide-y divide-le-line/60 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span><span className="font-mono text-xs text-le-muted">{r.serial}</span> · {r.markCode} · {rodLabel(r.diameter, r.lengthM)}</span>
                <span className={cn('text-xs font-semibold', r.status === 'APROVADA' ? 'text-le-success' : 'text-le-danger')}>
                  {r.status === 'APROVADA' ? 'Aprovada' : `Refugo${r.defect ? ` (${r.defect})` : ''}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
