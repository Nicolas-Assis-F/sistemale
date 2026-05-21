import type { Metadata } from 'next';
import { getCachedSearchResults } from '@/lib/cache';
import { ProductCard } from '@/components/public/ProductCard';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Busca: ${q}` : 'Busca' };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const products = await getCachedSearchResults(query);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {query ? `Resultados para "${query}"` : 'Todos os produtos'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {products.length} {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>Nenhum produto encontrado para &quot;{query}&quot;.</p>
          <p className="text-sm mt-2">Tente um termo diferente ou entre em contato pelo WhatsApp.</p>
        </div>
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
