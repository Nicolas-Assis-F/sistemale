import Image from 'next/image';
import Link from 'next/link';
import { Package, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { WhatsAppButton } from './WhatsAppButton';
import { IconTile } from './IconTile';
import { MotionCardShell } from './MotionCardShell';

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  priceCents: number;
  originalPriceCents?: number | null;
  images: string[];
  stock: number;
  sku: string;
}

export function ProductCard({
  slug,
  name,
  shortDesc,
  priceCents,
  originalPriceCents,
  images,
  stock,
  sku,
}: ProductCardProps) {
  const hasPromo = originalPriceCents != null && originalPriceCents > priceCents;
  const discount = hasPromo
    ? Math.round(((originalPriceCents! - priceCents) / originalPriceCents!) * 100)
    : 0;

  return (
    <MotionCardShell className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-raised">
      {/* Imagem */}
      <Link href={`/produto/${slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <IconTile icon={Package} label="Sem registro fotográfico" />
        )}
        {hasPromo && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            <Tag className="h-3 w-3" />
            -{discount}%
          </div>
        )}
        {stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
              Sob consulta
            </span>
          </div>
        )}
      </Link>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/produto/${slug}`}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>
        <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">{shortDesc}</p>

        <div className="mt-auto border-t border-border/60 pt-3">
          <div className="mb-2 flex items-end justify-between gap-1">
            <div>
              {hasPromo && (
                <p className="mb-0.5 text-xs leading-none text-muted-foreground line-through">
                  {formatCurrency(originalPriceCents!)}
                </p>
              )}
              <p className="text-base font-bold leading-none text-primary">{formatCurrency(priceCents)}</p>
            </div>
            {stock > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Em estoque
              </span>
            )}
          </div>

          <WhatsAppButton sku={sku} productName={name} className="h-9 w-full text-xs">
            Tenho interesse
          </WhatsAppButton>
        </div>
      </div>
    </MotionCardShell>
  );
}
