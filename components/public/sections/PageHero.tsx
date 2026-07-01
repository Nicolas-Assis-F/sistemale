import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  children?: React.ReactNode; // CTAs / conteúdo abaixo do subtítulo
  size?: 'default' | 'large';
  align?: 'center' | 'left';
  /** Foto de fundo opcional; sem foto usa gradiente + grade sutil. */
  image?: string;
}

/**
 * Hero institucional reutilizável (home e páginas internas).
 * Com `image`, exibe a foto com overlay navy para legibilidade; sem foto,
 * cai no gradiente da marca + textura de grade (`.bg-grid`) e blobs sutis.
 */
export function PageHero({ eyebrow, title, highlight, subtitle, children, size = 'default', align = 'center', image }: Props) {
  const left = align === 'left';

  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      {/* Fundo */}
      {image ? (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-br from-brand-900/95 via-brand-900/80 to-brand-700/65" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-linear-to-br from-brand-900 via-brand-700 to-brand-500" />
          <div className="absolute inset-0 bg-grid" aria-hidden />
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-32 -right-32 h-125 w-125 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-40 -left-32 h-100 w-100 rounded-full bg-brand-accent/10 blur-3xl" />
          </div>
        </>
      )}

      <div
        className={cn(
          'relative container mx-auto px-4',
          size === 'large' ? 'py-20 sm:py-28' : 'py-14 sm:py-20',
          left ? 'max-w-3xl' : 'max-w-4xl text-center',
        )}
      >
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent sm:text-sm">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {title}
          {highlight && (
            <>
              <br />
              <span className="text-brand-accent">{highlight}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p className={cn('mt-5 text-base leading-relaxed text-white/75 sm:text-lg', left ? 'max-w-2xl' : 'mx-auto max-w-2xl')}>
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
