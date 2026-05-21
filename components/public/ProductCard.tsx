import Image from 'next/image';
import Link from 'next/link';
import { Package, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { WhatsAppButton } from './WhatsAppButton';

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
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col">
      {/* Image */}
      <Link href={`/produto/${slug}`} className="block relative aspect-square bg-muted overflow-hidden">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/30">
            <Package className="h-10 w-10" />
            <span className="text-xs">Sem foto</span>
          </div>
        )}
        {hasPromo && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Tag className="h-3 w-3" />
            -{discount}%
          </div>
        )}
        {stock === 0 && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <span className="bg-background/90 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full border">
              Sob consulta
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <Link href={`/produto/${slug}`}>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
          {shortDesc}
        </p>

        <div className="pt-1 border-t border-border/50 mt-auto">
          <div className="flex items-end justify-between gap-1 mb-2">
            <div>
              {hasPromo && (
                <p className="text-xs text-muted-foreground line-through leading-none mb-0.5">
                  {formatCurrency(originalPriceCents!)}
                </p>
              )}
              <p className="font-bold text-base text-primary leading-none">
                {formatCurrency(priceCents)}
              </p>
            </div>
            {stock > 0 && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Em estoque
              </span>
            )}
          </div>

          <WhatsAppButton sku={sku} productName={name} className="w-full text-xs h-8">
            Tenho interesse
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}
