import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';
import { createProduct } from '../_actions';

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold">Novo Produto</h1>
      </div>
      <ProductForm
        categories={categories}
        action={createProduct}
        submitLabel="Criar Produto"
      />
    </div>
  );
}
