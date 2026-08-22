import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  label?: string;
  className?: string;
}

/**
 * "Placa técnica industrial" — usada como fallback de foto em áreas de mídia
 * grandes (CategoryCard, ProductCard). Substitui o antigo ícone lucide
 * centrado num círculo pastel por algo com cara de desenho técnico/blueprint.
 */
export function IconTile({ icon: Icon, label, className }: Props) {
  return (
    <div
      className={cn(
        'relative flex h-full items-center justify-center overflow-hidden bg-linear-to-br from-brand-900 to-brand-700 bg-grid-panel',
        className,
      )}
    >
      {/* Cantos técnicos */}
      <span className="absolute left-3 top-3 h-3 w-3 border-t border-l border-brand-accent/40" aria-hidden />
      <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-brand-accent/40" aria-hidden />

      {/* Moldura + ícone duotone */}
      <div className="relative flex items-center justify-center rounded-xl border border-white/15 p-5">
        <Icon className="absolute h-16 w-16 translate-x-1 translate-y-1 text-brand-accent/25 blur-md" aria-hidden />
        <Icon className="relative h-10 w-10 text-white/90" aria-hidden />
      </div>

      {label && (
        <span className="absolute inset-x-6 bottom-3 truncate text-center font-mono text-[10px] uppercase tracking-widest text-white/35">
          {label}
        </span>
      )}
    </div>
  );
}
