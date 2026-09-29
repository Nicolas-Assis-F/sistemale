import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';
import { createProduct } from '../_actions';
import { requireAdmin } from '@/lib/auth';

export default async function NewProductPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
      <div>
        <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-le-blue">Catálogo / nova ficha</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-le-text">Novo produto</h1>
        <p className="mt-2 text-sm text-le-muted">Preencha os dados essenciais, adicione fotos e confira a prévia antes de publicar.</p>
      </div>
      <ProductForm
        categories={categories}
        action={createProduct}
        submitLabel="Criar Produto"
      />
    </div>
  );
}
