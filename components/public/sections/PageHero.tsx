interface Props {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  children?: React.ReactNode; // CTAs
  size?: 'default' | 'large';
}

/** Hero institucional reutilizável — gradiente da marca + blobs sutis. */
export function PageHero({ eyebrow, title, highlight, subtitle, children, size = 'default' }: Props) {
  return (
    <section className="relative overflow-hidden bg-linear-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -right-32 w-125 h-125 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-100 h-100 rounded-full bg-brand-accent/10 blur-3xl" />
      </div>
      <div
        className={`relative container mx-auto max-w-4xl px-4 text-center ${
          size === 'large' ? 'py-20 sm:py-28' : 'py-14 sm:py-20'
        }`}
      >
        {eyebrow && (
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-white/55 mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
          {title}
          {highlight && (
            <>
              <br />
              <span className="text-brand-accent">{highlight}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p className="mt-5 text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">{children}</div>}
      </div>
    </section>
  );
}
