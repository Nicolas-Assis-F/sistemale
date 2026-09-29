import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { CostingNav } from '@/components/admin/costing/CostingNav';
import { InvoiceUpload } from '@/components/admin/costing/InvoiceUpload';

export default async function PurchaseInvoicesPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const invoices = await prisma.purchaseInvoice.findMany({
    orderBy: { issuedAt: 'desc' }, take: 100,
    select: { id: true, number: true, series: true, issuedAt: true, supplierName: true, supplierDoc: true, totalCents: true, items: { select: { appliedAt: true } } },
  });
  return (
    <div className="le-admin-page">
      <CostingNav active="/admin/custos/notas" title="Notas de compra"
        description="Importe o XML das NF-e de compra: fornecedor, itens, NCM, IPI e ICMS-ST são lidos automaticamente e o custo real de cada item (com frete e impostos) atualiza o material." />
      <InvoiceUpload />
      <div role="region" aria-label="Tabela de notas de compra" tabIndex={0} className="le-cost-table rounded-2xl border border-le-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-le-muted">
            <tr className="border-b border-le-line"><th scope="col" className="p-3 font-medium">Emissão</th><th scope="col" className="p-3 font-medium">Fornecedor</th><th scope="col" className="p-3 font-medium">Nota</th><th scope="col" className="p-3 text-right font-medium">Total</th><th scope="col" className="p-3 font-medium">Itens aplicados</th><th scope="col" className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-le-line">
            {invoices.map((inv) => {
              const applied = inv.items.filter((i) => i.appliedAt).length;
              return (
                <tr key={inv.id}>
                  <td className="p-3 text-xs">{inv.issuedAt?.toLocaleDateString('pt-BR') ?? '—'}</td>
                  <td className="p-3"><p className="font-medium">{inv.supplierName}</p><p className="font-mono text-[11px] text-le-muted">{inv.supplierDoc}</p></td>
                  <td className="p-3 text-xs">nº {inv.number} · série {inv.series}</td>
                  <td className="p-3 text-right tabular-nums">{formatCurrency(inv.totalCents)}</td>
                  <td className={`p-3 text-xs ${applied < inv.items.length ? 'text-amber-700' : 'text-le-success'}`}>{applied}/{inv.items.length}</td>
                  <td className="p-3 text-right"><Link href={`/admin/custos/notas/${inv.id}`} className="text-xs font-medium text-le-blue">Abrir</Link></td>
                </tr>
              );
            })}
            {!invoices.length && <tr><td colSpan={6} className="p-8 text-center text-le-muted">Nenhuma nota importada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
