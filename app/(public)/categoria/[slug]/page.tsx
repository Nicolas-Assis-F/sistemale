import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedCategory, getCachedCategoryProducts } from '@/lib/cache';
import { ProductCard } from '@/components/public/ProductCard';

type SortOption = 'nome' | 'preco-asc' | 'preco-desc';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ordem?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCachedCategory(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `Produtos da categoria ${category.name}`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ordem } = await searchParams;

  const category = await getCachedCategory(slug);
  if (!category) notFound();

  const sort = (ordem as SortOption) ?? 'nome';
  const allProducts = await getCachedCategoryProducts(category.id);

  const products = [...allProducts].sort((a, b) => {
    if (sort === 'preco-asc') return a.priceCents - b.priceCents;
    if (sort === 'preco-desc') return b.priceCents - a.priceCents;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar:</span>
          <div className="flex gap-1">
            {([
              { value: 'nome', label: 'A–Z' },
              { value: 'preco-asc', label: 'Menor preço' },
              { value: 'preco-desc', label: 'Maior preço' },
            ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
              <a
                key={value}
                href={`?ordem=${value}`}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  sort === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-transparent'
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">
          Nenhum produto nesta categoria no momento.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name}
              shortDesc={product.shortDesc}
              priceCents={product.priceCents}
              originalPriceCents={product.originalPriceCents}
              images={product.images}
              stock={product.stock}
              sku={product.sku}
            />
          ))}
        </div>
      )}
    </div>
  );
}
