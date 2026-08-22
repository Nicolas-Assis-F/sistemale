import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import { getProduct, getCachedRelatedProducts, getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_HOME, type HomeContent } from '@/lib/site-content';
import { formatCurrency } from '@/lib/format';
import { ProductGallery } from '@/components/public/ProductGallery';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { PulsingBadge } from '@/components/public/PulsingBadge';
import { StickyBuyBar } from '@/components/public/StickyBuyBar';
import { Reveal } from '@/components/public/Reveal';
import { RevealGroup } from '@/components/public/RevealGroup';
import { ProductTrustStrip } from '@/components/public/sections/ProductTrustStrip';
import { SectionHeading } from '@/components/public/sections/SectionHeading';
import { ProductCard } from '@/components/public/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.shortDesc,
    openGraph: {
      title: product.name,
      description: product.shortDesc,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await getProduct(slug);
  if (!product) notFound();

  const [relatedProducts, contentRow] = await Promise.all([
    getCachedRelatedProducts(product.categoryId, product.id),
    getCachedSiteContent('home').catch(() => null),
  ]);
  const homeContent = { ...DEFAULT_HOME, ...((contentRow?.value as Partial<HomeContent>) ?? {}) };

  const specs = product.specs as Record<string, string>;
  const hasPromo =
    product.originalPriceCents != null && product.originalPriceCents > product.priceCents;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Reveal>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/categoria/${product.category.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-50">{product.name}</span>
        </nav>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Galeria */}
        <Reveal>
          <ProductGallery images={product.images} productName={product.name} />
        </Reveal>

        {/* Detalhes */}
        <Reveal delay={100} className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
          </div>

          {/* Preço */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            {hasPromo ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-primary">
                  {formatCurrency(product.priceCents)}
                </span>
                <span className="text-base text-muted-foreground line-through">
                  {formatCurrency(product.originalPriceCents!)}
                </span>
                <PulsingBadge>
                  <Badge variant="destructive">PROMOÇÃO</Badge>
                </PulsingBadge>
              </div>
            ) : (
              <span className="text-3xl font-extrabold text-primary">
                {formatCurrency(product.priceCents)}
              </span>
            )}

            <div className="mt-2">
              {product.stock > 0 ? (
                <Badge className="bg-green-600 hover:bg-green-600 text-white">Em estoque</Badge>
              ) : (
                <Badge variant="secondary">Sob consulta</Badge>
              )}
            </div>
          </div>

          {/* CTA principal */}
          <WhatsAppButton sku={product.sku} productName={product.name} size="large">
            Quero esse produto
          </WhatsAppButton>

          {/* Sentinel + barra fixa de compra no mobile, ancorada logo após o CTA principal */}
          <StickyBuyBar sku={product.sku} productName={product.name} priceCents={product.priceCents} />

          {/* Faixa de confiança */}
          <ProductTrustStrip items={homeContent.guarantees} />

          <Separator />

          {/* Specs */}
          {Object.keys(specs).length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Especificações</h2>
              <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex flex-col bg-muted/50 rounded-lg px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{key}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </RevealGroup>
            </div>
          )}
        </Reveal>
      </div>

      {/* Descrição longa */}
      {product.description && (
        <Reveal className="mt-12">
          <Separator className="mb-8" />
          <h2 className="text-xl font-bold mb-6">Descrição</h2>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{product.description}</ReactMarkdown>
          </div>
        </Reveal>
      )}

      {/* Produtos relacionados */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <Separator className="mb-8" />
          <SectionHeading eyebrow="Você também pode gostar" title="Produtos relacionados" />
          <RevealGroup className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                name={p.name}
                shortDesc={p.shortDesc}
                priceCents={p.priceCents}
                originalPriceCents={p.originalPriceCents}
                images={p.images}
                stock={p.stock}
                sku={p.sku}
              />
            ))}
          </RevealGroup>
        </section>
      )}
    </div>
  );
}
