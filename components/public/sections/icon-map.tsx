import {
  Drill, Gauge, Wrench, Settings, Headphones, Truck, ShieldCheck, Zap,
  Droplets, Cog, Hammer, Factory, PackageCheck, Ruler, Anchor, CircleDot,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Drill, Gauge, Wrench, Settings, Headphones, Truck, ShieldCheck, Zap,
  Droplets, Cog, Hammer, Factory, PackageCheck, Ruler, Anchor, CircleDot,
};

/** Resolve o nome de um ícone lucide para o componente, com fallback. */
export function resolveIcon(name?: string | null): LucideIcon {
  if (name && ICONS[name]) return ICONS[name];
  return Wrench;
}

export const ICON_NAMES = Object.keys(ICONS);
