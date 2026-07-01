import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Phone } from 'lucide-react';
import { getCachedHomeData, getCachedServices, getCachedGalleryPreview, getCachedSiteContent } from '@/lib/cache';
import { DEFAULT_HOME, DEFAULT_SERVICOS, type HomeContent, type ServicosContent } from '@/lib/site-content';
import { ProductCard } from '@/components/public/ProductCard';
import { CategoryCard } from '@/components/public/CategoryCard';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { Reveal } from '@/components/public/Reveal';
import { PageHero } from '@/components/public/sections/PageHero';
import { SectionHeading } from '@/components/public/sections/SectionHeading';
import { ServiceCard } from '@/components/public/sections/ServiceCard';
import { StatBand } from '@/components/public/sections/StatBand';
import { ProcessSteps } from '@/components/public/sections/ProcessSteps';
import { Testimonials } from '@/components/public/sections/Testimonials';
import { Guarantees } from '@/components/public/sections/Guarantees';
import { CTASection } from '@/components/public/sections/CTASection';
import { resolveIcon } from '@/components/public/sections/icon-map';

export default async function HomePage() {
  const [{ categories, featured }, services, gallery, contentRow, servicosRow] = await Promise.all([
    getCachedHomeData().catch(() => ({ categories: [], featured: [] })),
    getCachedServices().catch(() => []),
    getCachedGalleryPreview().catch(() => []),
    getCachedSiteContent('home').catch(() => null),
    getCachedSiteContent('servicos').catch(() => null),
  ]);

  const c = { ...DEFAULT_HOME, ...((contentRow?.value as Partial<HomeContent>) ?? {}) };
  const steps = { ...DEFAULT_SERVICOS, ...((servicosRow?.value as Partial<ServicosContent>) ?? {}) }.steps;
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';
  const topServices = services.slice(0, 6);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <PageHero
        eyebrow={c.heroEyebrow}
        title={c.heroTitle}
        highlight={c.heroHighlight}
        subtitle={c.heroSubtitle}
        image={c.heroImage}
        align="left"
        size="large"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <WhatsAppButton className="h-12 px-7 text-sm font-semibold">Falar no WhatsApp</WhatsAppButton>
            <Link
              href="/busca"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20"
            >
              Ver catálogo completo <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {phone && (
            <a
              href={`tel:+${phone}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/85 transition-colors hover:text-white"
            >
              <Phone className="h-4 w-4" /> +{phone}
            </a>
          )}

          {c.trust?.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              {c.trust.map((t) => {
                const Icon = resolveIcon(t.icon);
                return (
                  <li key={t.title} className="inline-flex items-center gap-2 text-sm text-white/75">
                    <Icon className="h-4 w-4 text-brand-accent" /> {t.title}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PageHero>

      {/* Números (faixa elevada, sobrepondo o hero) */}
      {c.stats?.length > 0 && (
        <div className="relative z-10 -mt-10 px-4">
          <div className="container mx-auto">
            <Reveal>
              <StatBand stats={c.stats} />
            </Reveal>
          </div>
        </div>
      )}

      {/* Serviços (teaser) */}
      {topServices.length > 0 && (
        <section className="section bg-muted/50 px-4">
          <Reveal className="container mx-auto">
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
          </Reveal>
        </section>
      )}

      {/* Como trabalhamos */}
      <Reveal>
        <ProcessSteps steps={steps} />
      </Reveal>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="section bg-muted/50 px-4">
          <Reveal className="container mx-auto">
            <SectionHeading eyebrow="Navegue por" title="Categorias" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
          </Reveal>
        </section>
      )}

      {/* Destaques */}
      {featured.length > 0 && (
        <section className="section px-4">
          <Reveal className="container mx-auto">
            <SectionHeading
              eyebrow="Selecionados para você"
              title="Produtos em Destaque"
              link={{ href: '/busca', label: 'Ver todos' }}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          </Reveal>
        </section>
      )}

      {/* Depoimentos */}
      <Reveal>
        <Testimonials testimonials={c.testimonials} />
      </Reveal>

      {/* Galeria (teaser) */}
      {gallery.length > 0 && (
        <section className="section bg-muted/50 px-4">
          <Reveal className="container mx-auto">
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
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted shadow-card"
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                  <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/70 via-black/0 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="line-clamp-2 p-3 text-xs font-medium text-white">{item.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* Certificações & Garantia */}
      <Reveal>
        <Guarantees items={c.guarantees} />
      </Reveal>

      {/* CTA final */}
      <CTASection title={c.ctaTitle} subtitle={c.ctaSubtitle} />
    </div>
  );
}
