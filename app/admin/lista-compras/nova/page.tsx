import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { PurchaseListBuilder } from '@/components/admin/PurchaseListBuilder';
import { requireAdmin } from '@/lib/auth';

export default async function NewPurchaseListPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      partItems: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  const productsWithParts = products.filter((p) => p.partItems.length > 0);

  return (
    <div className="le-admin-page">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/lista-compras" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <h1 className="le-admin-title">Nova Lista de Compras</h1>
      </div>

      {productsWithParts.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-16 text-center text-muted-foreground">
          <p className="font-medium">Nenhuma máquina com peças cadastradas.</p>
          <p className="text-sm mt-1">
            Adicione peças e componentes às suas máquinas primeiro.
          </p>
          <Link
            href="/admin/produtos"
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
          >
            Ir para Produtos
          </Link>
        </div>
      ) : (
        <PurchaseListBuilder products={productsWithParts} />
      )}
    </div>
  );
}
