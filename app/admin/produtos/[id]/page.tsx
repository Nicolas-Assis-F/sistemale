import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { centsToCurrencyInput } from '@/lib/format';
import { ProductForm } from '@/components/admin/ProductForm';
import { PartItemsEditor } from '@/components/admin/PartItemsEditor';
import { updateProduct } from '../_actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function EditProductPage({ params, searchParams }: PageProps) {
  const [{ id }, { tab = 'dados' }] = await Promise.all([params, searchParams]);

  const [product, categories, partItems] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.partItem.findMany({ where: { productId: id }, orderBy: { createdAt: 'asc' } }),
  ]);

  if (!product) notFound();

  const action = updateProduct.bind(null, id);

  const specs = product.specs as Record<string, string>;
  const specsArray = Object.entries(specs).map(([key, value]) => ({ key, value }));

  const activeTab = tab === 'pecas' ? 'pecas' : 'dados';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold">Editar: {product.name}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <Link
          href={`/admin/produtos/${id}?tab=dados`}
          className={[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'dados'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          Dados do Produto
        </Link>
        <Link
          href={`/admin/produtos/${id}?tab=pecas`}
          className={[
            'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
            activeTab === 'pecas'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          Peças e Componentes
          {partItems.length > 0 && (
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {partItems.length}
            </span>
          )}
        </Link>
      </div>

      {/* Content */}
      {activeTab === 'pecas' ? (
        <PartItemsEditor productId={id} items={partItems} />
      ) : (
        <ProductForm
          categories={categories}
          defaultValues={{
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            categoryId: product.categoryId,
            shortDesc: product.shortDesc,
            description: product.description,
            priceReais: centsToCurrencyInput(product.priceCents),
            originalPriceReais: product.originalPriceCents
              ? centsToCurrencyInput(product.originalPriceCents)
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
      )}
    </div>
  );
}
