import { cn } from '@/lib/utils';

interface Props {
  items: string[];
  className?: string;
}

/** Ticker horizontal infinito de capacidades. Faixa escura, pausa no hover. */
export function Marquee({ items, className }: Props) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <div className={cn('marquee-pause relative overflow-hidden border-y border-ink-line bg-ink py-4 text-white', className)}>
      <div className="mask-fade-x flex">
        <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
          {loop.map((item, i) => (
            <span key={i} className="flex shrink-0 items-center gap-10">
              <span className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">{item}</span>
              <span className="text-orange" aria-hidden>◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
