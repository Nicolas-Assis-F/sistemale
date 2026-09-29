import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { SheetEditor } from '@/components/admin/costing/SheetEditor';
import { ActionButton } from '@/components/admin/costing/ActionForm';
import { defaultPricingProfile, loadCatalog, priceInputs } from '@/lib/domains/costing/service';
import { deleteSheet } from '../../_actions';

export default async function CostSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;
  const [sheet, catalog, materials, profile, products, sheetsMeta] = await Promise.all([
    prisma.costSheet.findUnique({ where: { id }, include: { pricingProfile: true, usedIn: { select: { sheet: { select: { id: true, name: true } } } } } }),
    loadCatalog(),
    prisma.material.findMany({ where: { active: true }, orderBy: [{ kind: 'asc' }, { name: 'asc' }] }),
    defaultPricingProfile(),
    prisma.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, priceCents: true, costSheet: { select: { id: true, name: true } } } }),
    prisma.costSheet.findMany({ orderBy: { name: 'asc' }, select: { id: true } }),
  ]);
  if (!sheet) notFound();
  const current = catalog.sheets.get(id)!;
  const parents = [...new Map(sheet.usedIn.map((u) => [u.sheet.id, u.sheet])).values()];

  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos" title={sheet.name}
        description="Monte a ficha com matéria-prima, componentes, processos, serviços e subconjuntos. Tudo recalcula enquanto você digita; salve para gravar."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/custos" className="text-sm text-le-muted hover:text-le-text">← Todas as fichas</Link>
            <ActionButton action={deleteSheet.bind(null, id)} confirm={`Excluir a ficha "${sheet.name}"?`} className="text-sm text-le-muted hover:text-red-600">Excluir ficha</ActionButton>
          </div>
        } />
      {parents.length > 0 && (
        <p className="text-xs text-le-muted">Usada como subconjunto em: {parents.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link href={`/admin/custos/fichas/${p.id}`} className="text-le-blue">{p.name}</Link></span>)}</p>
      )}
      <SheetEditor
        sheet={{ id: sheet.id, name: sheet.name, batchQty: sheet.batchQty, ncm: sheet.ncm, notes: sheet.notes, productId: sheet.productId, lines: current.lines }}
        materials={materials.map((m) => ({ id: m.id, name: m.name, kind: m.kind, unit: m.unit, unitCostCents: m.unitCostCents, diameterMm: m.diameterMm, wallMm: m.wallMm, sizeLabel: m.sizeLabel }))}
        workCenters={[...catalog.workCenters.values()].sort((a, b) => a.name.localeCompare(b.name))}
        sheets={sheetsMeta.map((s) => catalog.sheets.get(s.id)!).filter(Boolean)}
        products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, takenBy: p.costSheet && p.costSheet.id !== id ? p.costSheet.name : null }))}
        inputs={priceInputs(sheet.pricingProfile ?? profile)}
      />
    </div>
  );
}
