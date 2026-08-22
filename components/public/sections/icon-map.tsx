import {
  Drill, Gauge, Wrench, Settings, Headphones, Truck, ShieldCheck, Zap,
  Droplets, Cog, Hammer, Factory, PackageCheck, Ruler, Anchor, CircleDot,
  Package, Waves,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Drill, Gauge, Wrench, Settings, Headphones, Truck, ShieldCheck, Zap,
  Droplets, Cog, Hammer, Factory, PackageCheck, Ruler, Anchor, CircleDot,
  Package, Waves,
};

/** Resolve o nome de um ícone lucide para o componente, com fallback parametrizável. */
export function resolveIcon(name?: string | null, fallback: LucideIcon = Wrench): LucideIcon {
  if (name && ICONS[name]) return ICONS[name];
  return fallback;
}

export const ICON_NAMES = Object.keys(ICONS);
