import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Phone } from 'lucide-react';
import { getCachedHomeData, getCachedServices, getCachedGalleryPreview, getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_HOME, type HomeContent } from '@/lib/site-content';
import { buttonVariants } from '@/components/ui/button';
import { ProductCard } from '@/components/public/ProductCard';
import { CategoryCard } from '@/components/public/CategoryCard';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { SectionHeading } from '@/components/public/sections/SectionHeading';
import { ServiceCard } from '@/components/public/sections/ServiceCard';
import { TrustBand } from '@/components/public/sections/TrustBand';
import { CTASection } from '@/components/public/sections/CTASection';

export default async function HomePage() {
  const [{ categories, featured }, services, gallery, contentRow] = await Promise.all([
    getCachedHomeData().catch(() => ({ categories: [], featured: [] })),
    getCachedServices().catch(() => []),
    getCachedGalleryPreview().catch(() => []),
    getCachedSiteContent('home').catch(() => null),
  ]);

  const c = { ...DEFAULT_HOME, ...((contentRow?.value as Partial<HomeContent>) ?? {}) };
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';
  const topServices = services.slice(0, 6);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-32 -right-32 w-125 h-125 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-100 h-100 rounded-full bg-brand-accent/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-200 h-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative container mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/55 sm:text-sm">
            {c.heroEyebrow}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {c.heroTitle}
            <br />
            <span className="text-brand-accent">{c.heroHighlight}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            {c.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <WhatsAppButton className="px-8 py-3 text-sm font-semibold sm:w-auto">
              Falar no WhatsApp
            </WhatsAppButton>
            <Link
              href="/busca"
              className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 hover:text-white'}
            >
              Ver Catálogo Completo <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          {phone && (
            <p className="flex items-center justify-center gap-1.5 pt-6 text-xs text-white/40">
              <Phone className="h-3 w-3" />+{phone}
            </p>
          )}
        </div>
      </section>

      {/* Trust */}
      <TrustBand />

      {/* Serviços (teaser) */}
      {topServices.length > 0 && (
        <section className="section bg-muted/50 px-4">
          <div className="container mx-auto">
            <SectionHeading
              eyebrow="O que fazemos"
              title="Soluções para perfuração de poços"
              link={{ href: '/servicos', label: 'Ver todos os serviços' }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topServices.map((s) => (
                <ServiceCard key={s.id} title={s.title} description={s.description} icon={s.icon} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="py-14 px-4">
          <div className="container mx-auto">
            <SectionHeading eyebrow="Navegue por" title="Categorias" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  slug={cat.slug}
                  name={cat.name}
                  description={cat.description}
                  icon={cat.icon}
                  productCount={cat._count.products}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Destaques */}
      {featured.length > 0 && (
        <section className="py-14 px-4 bg-muted/50">
          <div className="container mx-auto">
            <SectionHeading
              eyebrow="Selecionados para você"
              title="Produtos em Destaque"
              link={{ href: '/busca', label: 'Ver todos' }}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {featured.map((product) => (
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
          </div>
        </section>
      )}

      {/* Galeria (teaser) */}
      {gallery.length > 0 && (
        <section className="py-14 px-4">
          <div className="container mx-auto">
            <SectionHeading
              eyebrow="Nosso trabalho"
              title="Galeria de Projetos"
              link={{ href: '/galeria', label: 'Ver galeria' }}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {gallery.map((item) => (
                <Link
                  key={item.id}
                  href="/galeria"
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <CTASection title={c.ctaTitle} subtitle={c.ctaSubtitle} />
    </div>
  );
}
