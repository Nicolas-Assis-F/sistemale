import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { FileText, ShoppingCart } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseListDetailPage({ params }: PageProps) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const { id } = await params;

  const list = await prisma.purchaseList.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          partItem: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      },
    },
  });

  if (!list) notFound();

  // Group items by product
  const byProduct = new Map<
    string,
    {
      product: { id: string; name: string; sku: string };
      items: typeof list.items;
    }
  >();

  for (const item of list.items) {
    const prod = item.partItem.product;
    if (!byProduct.has(prod.id)) {
      byProduct.set(prod.id, { product: prod, items: [] });
    }
    byProduct.get(prod.id)!.items.push(item);
  }

  const totalCents = list.items.reduce(
    (sum, i) => sum + i.partItem.unitPriceCents * i.partItem.quantity,
    0,
  );
  const uncotedCount = list.items.filter((i) => i.partItem.unitPriceCents === 0).length;

  return (
    <div className="le-admin-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/admin/lista-compras" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            ← Voltar
          </Link>
          <div>
            <h1 className="le-admin-title">{list.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {list.items.length} {list.items.length === 1 ? 'item' : 'itens'} •{' '}
              Criada em {list.createdAt.toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <a
          href={`/api/lista-compras/${id}/pdf`}
          target="_blank"
          className={buttonVariants({ size: 'sm' })}
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Exportar PDF
        </a>
      </div>

      {/* Grouped tables */}
      <div className="space-y-6">
        {Array.from(byProduct.values()).map(({ product, items }) => {
          const subtotal = items.reduce(
            (sum, i) => sum + i.partItem.unitPriceCents * i.partItem.quantity,
            0,
          );
          return (
            <div key={product.id} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{product.name}</span>
                <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
              </div>
              <table className="le-responsive-table w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Componente</th>
                    <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Localização</th>
                    <th className="text-left px-4 py-2.5 font-medium">Categoria</th>
                    <th className="text-right px-4 py-2.5 font-medium">Qtd</th>
                    <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Preço Unit.</th>
                    <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td data-label="Componente" className="px-4 py-2.5">
                        <span className="font-medium">{item.partItem.name}</span>
                        {item.partItem.notes && (
                          <p className="text-xs text-muted-foreground">{item.partItem.notes}</p>
                        )}
                      </td>
                      <td data-label="Localização" className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                        {item.partItem.location || '—'}
                      </td>
                      <td data-label="Categoria" className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {item.partItem.category}
                        </Badge>
                      </td>
                      <td data-label="Qtd" className="px-4 py-2.5 text-right tabular-nums">{item.partItem.quantity}</td>
                      <td data-label="Preço Unit." className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell">
                        {item.partItem.unitPriceCents === 0 ? (
                          <span className="text-muted-foreground italic text-xs">a cotar</span>
                        ) : (
                          formatCurrency(item.partItem.unitPriceCents)
                        )}
                      </td>
                      <td data-label="Total" className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell">
                        {item.partItem.unitPriceCents === 0 ? (
                          <span className="text-muted-foreground italic text-xs">—</span>
                        ) : (
                          formatCurrency(item.partItem.unitPriceCents * item.partItem.quantity)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-sm font-medium">
                      Subtotal
                    </td>
                    <td data-label="Componente" className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {items.reduce((s, i) => s + i.partItem.quantity, 0)}
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td data-label="Localização" className="px-4 py-2.5 text-right tabular-nums font-medium hidden sm:table-cell">
                      {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      <div className="border rounded-lg p-4 bg-card flex items-center justify-between">
        <span className="font-semibold">
          Total Geral
          {uncotedCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({uncotedCount} {uncotedCount === 1 ? 'item' : 'itens'} a cotar)
            </span>
          )}
        </span>
        <span className="text-lg font-bold tabular-nums">
          {totalCents > 0 ? formatCurrency(totalCents) : '—'}
        </span>
      </div>
    </div>
  );
}
