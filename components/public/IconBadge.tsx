import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  className?: string;
}

/**
 * Badge de ícone inline (pequeno) com o mesmo princípio duotone da IconTile,
 * pensado para caber no lugar dos antigos círculos `bg-primary/10`/`bg-brand-accent/12`
 * de ServiceCard e Guarantees. Espera um ancestral com classe `group` para o glow no hover.
 */
export function IconBadge({ icon: Icon, className }: Props) {
  return (
    <div
      className={cn(
        'relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-500/20 bg-linear-to-br from-brand-500/12 to-brand-accent/10 transition-all group-hover:ring-2 group-hover:ring-brand-accent/50',
        className,
      )}
    >
      <Icon className="absolute h-7 w-7 translate-x-0.5 translate-y-0.5 text-brand-accent/30 blur-[3px]" aria-hidden />
      <Icon className="relative h-5 w-5 text-primary" aria-hidden />
    </div>
  );
}
