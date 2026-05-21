'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
        <Package className="h-20 w-20 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-square bg-muted rounded-xl overflow-hidden cursor-zoom-in"
        onClick={() => setLightboxOpen(true)}
      >
        <Image
          src={images[selected]}
          alt={productName}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        <div className="absolute top-2 right-2 bg-black/40 rounded-full p-1.5">
          <ZoomIn className="h-4 w-4 text-white" />
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                'relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors',
                selected === i ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
              )}
            >
              <Image src={src} alt={`${productName} ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          <div className="relative aspect-square w-full">
            <Image
              src={images[selected]}
              alt={productName}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
