import { getHeroMedia } from '@/lib/hero-media';
import { HeroVideo } from './HeroVideo';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, MapPin, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { buildWhatsAppUrl } from '@/lib/whatsapp-url';

interface HeroProduct {
  slug: string;
  name: string;
  priceCents: number;
  images: string[];
  sku: string;
}

interface Props {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle: string;
  stats?: { label: string; value: string }[];
  featured?: HeroProduct | null;
}

export async function HomeHero({ eyebrow, title, highlight, subtitle, stats = [], featured }: Props) {
  const media = await getHeroMedia();
  const headline = highlight || title;

  return (
    <section className="relative isolate overflow-hidden bg-[#101d28] text-white">
      {media ? <HeroVideo media={media} /> : <Image src="/brand/usinagem-editorial.webp" alt="" fill priority sizes="100vw" className="object-cover object-[62%_center]" />}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,19,29,.98)_0%,rgba(8,19,29,.87)_39%,rgba(8,19,29,.23)_82%),linear-gradient(0deg,rgba(8,19,29,.88),transparent_42%)]" aria-hidden />

      <div className="relative container mx-auto flex min-h-[640px] flex-col justify-between px-5 pt-20 sm:min-h-[700px] sm:px-8 sm:pt-24 lg:pt-28">
        <div className="max-w-[770px] pb-24 sm:pb-28">
          <div className="mb-9 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[.18em] text-white/75">
            <span className="h-2 w-2 rounded-full bg-orange" aria-hidden />
            {title}
            <span className="h-px w-8 bg-white/30" aria-hidden />
            <span className="font-normal tracking-[.12em]">{eyebrow}</span>
          </div>

          <h1 className="max-w-[820px] font-heading text-[clamp(3rem,6.4vw,6.8rem)] font-bold leading-[.99] tracking-[-.055em] text-balance">
            {headline}<span className="text-orange">.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/78 sm:text-lg">{subtitle}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/busca" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-orange px-6 text-sm font-bold text-le-text transition-transform hover:-translate-y-0.5 hover:bg-[#f6ac4f]">
              Explorar equipamentos <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a href={buildWhatsAppUrl({})} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <MessageCircle className="h-4 w-4" /> Falar com um especialista
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-white/25 py-5 text-xs text-white/75 sm:text-sm">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-orange" /> Aparecida de Goiânia · GO</span>
            {stats.slice(0, 2).map((item) => (
              <span key={item.label}><strong className="text-white">{item.value}</strong> {item.label.toLowerCase()}</span>
            ))}
          </div>
          <a href="#linhas" className="inline-flex items-center gap-2 font-semibold text-white hover:text-orange">Conheça a linha <ArrowDown className="h-4 w-4" /></a>
        </div>
      </div>

      {featured && (
        <Link href={`/produto/${featured.slug}`} className="absolute bottom-22 right-[max(2rem,calc((100vw-1280px)/2))] hidden w-72 border-l-2 border-orange bg-[#101d28]/88 p-4 text-white backdrop-blur-md transition-colors hover:bg-[#15293a] xl:block">
          <span className="text-[11px] font-bold uppercase tracking-[.18em] text-orange">Em destaque · {featured.sku}</span>
          <span className="mt-1 block line-clamp-2 text-sm font-semibold">{featured.name}</span>
          <span className="mt-2 flex items-center justify-between text-sm font-bold">{formatCurrency(featured.priceCents)} <ArrowUpRight className="h-4 w-4" /></span>
        </Link>
      )}
    </section>
  );
}
