import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { centsToCurrencyInput } from '@/lib/format';
import { ProductForm } from '@/components/admin/ProductForm';
import { PartItemsEditor } from '@/components/admin/PartItemsEditor';
import { updateProduct } from '../_actions';
import { requireAdmin } from '@/lib/auth';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function EditProductPage({ params, searchParams }: PageProps) {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
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
    <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
      <div>
        <Link href="/admin/produtos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          ← Voltar
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-le-blue">Catálogo / edição</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-le-text">{product.name}</h1>
        <p className="mt-2 text-sm text-le-muted">Atualize a ficha e confira a apresentação ao lado do formulário.</p>
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
          submitLabel="Salvar alterações"
        />
      )}
    </div>
  );
}
