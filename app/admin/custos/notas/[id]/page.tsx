import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { ActionButton } from '@/components/admin/costing/ActionForm';
import { InvoiceItemRow } from '@/components/admin/costing/InvoiceItemRow';
import { deletePurchaseInvoice } from '../../_actions';

export default async function PurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;
  const [invoice, materials] = await Promise.all([
    prisma.purchaseInvoice.findUnique({ where: { id }, select: { id: true, number: true, series: true, issuedAt: true, supplierName: true, supplierDoc: true, supplierUf: true, totalCents: true, accessKey: true, items: { orderBy: { position: 'asc' } } } }),
    prisma.material.findMany({ where: { active: true }, orderBy: [{ kind: 'asc' }, { name: 'asc' }], select: { id: true, name: true, kind: true, unit: true, diameterMm: true, wallMm: true, unitCostCents: true } }),
  ]);
  if (!invoice) notFound();
  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos/notas" title={`${invoice.supplierName} · NF ${invoice.number}`}
        description={`Emitida em ${invoice.issuedAt?.toLocaleDateString('pt-BR') ?? '—'} · ${invoice.supplierDoc}${invoice.supplierUf ? ` (${invoice.supplierUf})` : ''} · total ${formatCurrency(invoice.totalCents)}`}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/custos/notas" className="text-sm text-le-muted">← Notas</Link>
            <ActionButton action={deletePurchaseInvoice.bind(null, id)} confirm="Remover esta nota? Os custos já aplicados continuam nos materiais." className="text-sm text-le-muted hover:text-red-600">Remover</ActionButton>
          </div>
        } />
      {!materials.length && <p className="rounded-xl bg-le-tint p-3 text-sm">Cadastre os materiais primeiro (<Link href="/admin/custos/materiais" className="text-le-blue">Materiais</Link>) para ligar os itens da nota.</p>}
      <div role="region" aria-label="Itens da nota de compra" tabIndex={0} className="le-cost-table rounded-2xl border border-le-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-le-muted">
            <tr className="border-b border-le-line"><th scope="col" className="p-3 font-medium">Item da nota</th><th scope="col" className="p-3 text-right font-medium">Custo real</th><th scope="col" className="p-3 font-medium">Material do cadastro</th><th scope="col" className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-le-line">
            {invoice.items.map((it) => (
              <InvoiceItemRow key={it.id} materials={materials}
                item={{ id: it.id, description: it.description, ncm: it.ncm, unit: it.unit, quantity: it.quantity, effectiveUnitCostCents: it.effectiveUnitCostCents, effectiveTotalCents: it.effectiveTotalCents, ipiCents: it.ipiCents, icmsStCents: it.icmsStCents, materialId: it.materialId, kgPerUnit: it.kgPerUnit, appliedAt: it.appliedAt?.toISOString() ?? null }} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-le-muted">Custo real = produto + frete + seguro + outras despesas − desconto + IPI + ICMS-ST. No Simples esses impostos não geram crédito e entram no custo. Chave: <span className="font-mono">{invoice.accessKey}</span></p>
    </div>
  );
}
