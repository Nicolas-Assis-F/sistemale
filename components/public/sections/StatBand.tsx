interface Props {
  stats: { label: string; value: string }[];
  variant?: 'light' | 'onBrand';
}

export function StatBand({ stats, variant = 'light' }: Props) {
  const onBrand = variant === 'onBrand';
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border md:grid-cols-4 ${
        onBrand ? 'border-white/15 bg-white/15' : 'border-border bg-border'
      }`}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-8 text-center ${
            onBrand ? 'bg-brand-900 text-white' : 'bg-card'
          }`}
        >
          <span className={`text-3xl font-extrabold tracking-tight ${onBrand ? 'text-brand-accent' : 'text-primary'}`}>
            {s.value}
          </span>
          <span className={`text-xs font-medium uppercase tracking-wide ${onBrand ? 'text-white/60' : 'text-muted-foreground'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
