import Image from 'next/image';
import Link from 'next/link';
import { Droplets, ChevronRight } from 'lucide-react';
import { resolveIcon } from './sections/icon-map';
import { IconTile } from './IconTile';
import { MotionCardShell } from './MotionCardShell';

interface CategoryCardProps {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  productCount: number;
}

export function CategoryCard({ slug, name, description, icon, image, productCount }: CategoryCardProps) {
  return (
    <MotionCardShell className="h-full">
      <Link
        href={`/categoria/${slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-raised"
      >
        {/* Mídia: foto quando houver, senão placa técnica sobre fundo da marca */}
        <div className="relative aspect-4/3 overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <IconTile icon={resolveIcon(icon, Droplets)} label={name} />
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {name}
          </h3>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground/70">
              {productCount} {productCount === 1 ? 'produto' : 'produtos'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </div>
      </Link>
    </MotionCardShell>
  );
}
