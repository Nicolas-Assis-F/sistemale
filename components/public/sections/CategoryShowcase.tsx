import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveIcon } from './icon-map';

interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  cover?: string | null;
  _count: { products: number };
}

function BentoCard({ cat, large }: { cat: Category; large?: boolean }) {
  const count = cat._count.products;
  const Icon = resolveIcon(cat.icon, Droplets);
  return (
    <Link
      href={`/categoria/${cat.slug}`}
      className={cn(
        'group relative isolate flex flex-col justify-end overflow-hidden rounded-lg border border-border/70 bg-ink shadow-sharp transition-colors hover:border-primary/40',
        large ? 'min-h-64 p-6 sm:min-h-80 lg:col-span-2 lg:row-span-2 lg:min-h-full' : 'min-h-44 p-5',
      )}
    >
      {/* Mídia de fundo */}
      {cat.cover ? (
        <Image
          src={cat.cover}
          alt={cat.name}
          fill
          sizes={large ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 640px) 50vw, 25vw'}
          className="-z-10 object-cover opacity-70 transition-[transform,opacity] duration-300 group-hover:scale-105 group-hover:opacity-80"
        />
      ) : (
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(145deg,#2b4a59,#172d39)]"><Icon className="absolute right-4 top-4 h-24 w-24 stroke-[.7] text-white/10" /><span className="absolute left-5 top-5 font-mono text-[11px] uppercase tracking-[.18em] text-white/70">Linha / LE</span></div>
      )}
      {/* Overlay de leitura */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/55 to-ink/10" aria-hidden />
      <span className="card-accent-top" aria-hidden />

      <div className="relative">
        <span className="mb-2 inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
          {count} {count === 1 ? 'produto' : 'produtos'}
        </span>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className={cn('font-heading font-bold tracking-tight text-white', large ? 'text-2xl sm:text-3xl' : 'text-lg')}>
              {cat.name}
            </h3>
            {large && cat.description && (
              <p className="mt-1.5 line-clamp-2 max-w-md text-sm text-white/70">{cat.description}</p>
            )}
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm transition-colors group-hover:border-orange group-hover:bg-orange">
            <ArrowUpRight className="h-4 w-4 text-white transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Bento editorial de categorias — primeira em destaque, demais em grade. */
export function CategoryShowcase({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  const [first, ...rest] = categories;

  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-4 lg:grid-cols-4">
      <BentoCard cat={first} large />
      {rest.slice(0, 6).map((cat) => (
        <BentoCard key={cat.id} cat={cat} />
      ))}
    </div>
  );
}
