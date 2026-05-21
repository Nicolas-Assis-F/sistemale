import Link from 'next/link';
import {
  Droplets, Wrench, Settings, Zap, Package, Hammer, ChevronRight,
  Drill, Gauge, Waves, CircleDot,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Droplets,
  Wrench,
  Settings,
  Zap,
  Package,
  Hammer,
  Drill,
  Gauge,
  Waves,
  CircleDot,
};

function CategoryIcon({ icon }: { icon?: string | null }) {
  const Icon = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : Droplets;
  return <Icon className="h-6 w-6 text-primary" />;
}

interface CategoryCardProps {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  productCount: number;
}

export function CategoryCard({ slug, name, description, icon, productCount }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${slug}`}
      className="group relative flex flex-col gap-3 p-5 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
        <CategoryIcon icon={icon} />
      </div>

      <div className="relative flex-1 min-w-0">
        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
          {name}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1.5 font-medium">
          {productCount} {productCount === 1 ? 'produto' : 'produtos'}
        </p>
      </div>

      <ChevronRight className="relative h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all self-end" />
    </Link>
  );
}
