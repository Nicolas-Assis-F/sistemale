import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';
import { updateProduct } from '../_actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  if (!product) notFound();

  const action = updateProduct.bind(null, id);

  const specs = product.specs as Record<string, string>;
  const specsArray = Object.entries(specs).map(([key, value]) => ({ key, value }));

  function formatPriceReais(cents: number): string {
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold">Editar: {product.name}</h1>
      </div>
      <ProductForm
        categories={categories}
        defaultValues={{
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          categoryId: product.categoryId,
          shortDesc: product.shortDesc,
          description: product.description,
          priceReais: formatPriceReais(product.priceCents),
          originalPriceReais: product.originalPriceCents
            ? formatPriceReais(product.originalPriceCents)
            : '',
          stock: product.stock,
          active: product.active,
          featured: product.featured,
          images: product.images,
          specs: specsArray,
        }}
        action={action}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
