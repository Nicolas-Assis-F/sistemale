interface Props {
  stats: { label: string; value: string }[];
  variant?: 'light' | 'onBrand';
}

export function StatBand({ stats, variant = 'light' }: Props) {
  const onBrand = variant === 'onBrand';
  return (
    <div
      className={`relative grid grid-cols-2 gap-px overflow-hidden rounded-2xl border md:grid-cols-4 ${
        onBrand ? 'border-white/15 bg-white/15' : 'border-border bg-border shadow-sharp'
      }`}
    >
      {/* Fio de acento no topo */}
      <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-linear-to-r from-orange via-brand-accent to-primary" aria-hidden />
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center ${
            onBrand ? 'bg-ink text-white' : 'bg-card'
          }`}
        >
          <span
            className={`font-heading text-3xl font-extrabold tracking-tight sm:text-4xl ${
              onBrand ? 'text-white' : 'text-primary'
            }`}
          >
            {s.value}
          </span>
          <span className={`text-xs font-medium uppercase tracking-wider ${onBrand ? 'text-white/60' : 'text-muted-foreground'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
