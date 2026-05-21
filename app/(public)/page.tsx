import Link from 'next/link';
import { ArrowRight, Zap, Headphones, ShieldCheck, Phone } from 'lucide-react';
import { getCachedHomeData } from '@/lib/cache';
import { buttonVariants } from '@/components/ui/button';
import { ProductCard } from '@/components/public/ProductCard';
import { CategoryCard } from '@/components/public/CategoryCard';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';

const trustItems = [
  { icon: Zap, title: 'Pronta Entrega', desc: 'Estoque disponível para envio imediato em todo o Brasil.' },
  { icon: Headphones, title: 'Suporte Técnico', desc: 'Equipe especializada para ajudar na escolha certa.' },
  { icon: ShieldCheck, title: 'Garantia', desc: 'Todos os produtos com garantia do fabricante.' },
];

export default async function HomePage() {
  const { categories, featured } = await getCachedHomeData().catch(() => ({ categories: [], featured: [] }));
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Catálogo';
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '';
  const address = process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? '';

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-[oklch(0.22_0.08_232)] via-[oklch(0.30_0.13_232)] to-[oklch(0.38_0.17_232)] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-32 -right-32 w-125 h-125 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-100 h-100 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative container mx-auto max-w-4xl px-4 py-20 sm:py-28 text-center space-y-6">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-white/50">
            Fundada em 2021 · Aparecida de Goiânia – GO
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
            {companyName}<br />
            <span className="text-[oklch(0.80_0.14_200)]">Poços Artesianos</span>
          </h1>
          <p className="text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            Fabricamos todos os equipamentos para poços artesianos — máquinas de 40m a 100m,
            cabeçote hidráulico, roscas e hastes de perfuração. Pronta entrega e suporte técnico especializado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <WhatsAppButton size="large" className="sm:w-auto px-8 py-3 text-sm font-semibold">
              Falar no WhatsApp
            </WhatsAppButton>
            <Link
              href="/busca"
              className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' border-white/25 text-white bg-white/10 hover:bg-white/20 hover:text-white hover:border-white/40'}
            >
              Ver Catálogo Completo <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          {phone && (
            <p className="text-white/40 text-xs flex items-center justify-center gap-1.5 pt-2">
              <Phone className="h-3 w-3" />
              +{phone}
            </p>
          )}
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="py-14 px-4">
          <div className="container mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-primary/60 mb-1">Navegue por</p>
                <h2 className="text-2xl font-bold">Categorias</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-primary/60 mb-1">Selecionados para você</p>
                <h2 className="text-2xl font-bold">Produtos em Destaque</h2>
              </div>
              <Link
                href="/busca"
                className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-primary gap-1'}
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

      {/* Trust */}
      <section className="py-14 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {trustItems.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start p-6 rounded-2xl border bg-card hover:shadow-sm transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-14 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-2xl text-center space-y-4">
          <h2 className="text-2xl font-bold">Precisa de ajuda para escolher?</h2>
          <p className="text-primary-foreground/75 text-sm leading-relaxed">
            Nossa equipe técnica está pronta para indicar a peça certa para o seu poço artesiano.
          </p>
          <WhatsAppButton size="large" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
            Consultar via WhatsApp
          </WhatsAppButton>
        </div>
      </section>
    </div>
  );
}
