'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, m } from 'motion/react';
import { ChevronLeft, ChevronRight, Package, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { IconTile } from './IconTile';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMultiple = images.length > 1;

  function prev() {
    setSelected((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setSelected((i) => (i + 1) % images.length);
  }

  useEffect(() => {
    if (!hasMultiple) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple]);

  if (images.length === 0) {
    return <IconTile icon={Package} label="Sem registro fotográfico" className="aspect-square rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-muted"
        onClick={() => setLightboxOpen(true)}
      >
        <AnimatePresence>
          <m.div
            key={selected}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <Image
              src={images[selected]}
              alt={productName}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={selected === 0}
            />
          </m.div>
        </AnimatePresence>

        <div className="absolute top-2 right-2 rounded-full bg-black/40 p-1.5">
          <ZoomIn className="h-4 w-4 text-white" />
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Imagem anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Próxima imagem"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <m.button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                selected === i ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30',
              )}
            >
              <Image src={src} alt={`${productName} ${i + 1}`} fill className="object-cover" sizes="64px" />
            </m.button>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl bg-black/95 p-2 sm:max-w-3xl">
          <div className="relative aspect-square w-full overflow-hidden">
            <AnimatePresence>
              <m.div
                key={selected}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Image src={images[selected]} alt={productName} fill className="object-contain" sizes="90vw" />
              </m.div>
            </AnimatePresence>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Imagem anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Próxima imagem"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
