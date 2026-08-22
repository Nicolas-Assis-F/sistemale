'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RevealGroup } from './RevealGroup';

export interface GalleryGridItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  category?: string | null;
}

export function GalleryGrid({ items }: { items: GalleryGridItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;
  const current = isOpen ? items[openIndex] : null;

  const go = (dir: 1 | -1) => {
    setOpenIndex((i) => {
      if (i === null) return i;
      return (i + dir + items.length) % items.length;
    });
  };

  return (
    <>
      <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-muted text-left shadow-card"
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="line-clamp-1 text-sm font-semibold text-white">{item.title}</p>
              {item.category && <p className="text-xs text-white/70">{item.category}</p>}
            </div>
          </button>
        ))}
      </RevealGroup>

      <Dialog open={isOpen} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-4xl border-none bg-black/95 p-2">
          {current && (
            <div className="flex flex-col gap-3">
              <div className="relative aspect-video w-full">
                <Image src={current.imageUrl} alt={current.title} fill className="object-contain" sizes="90vw" />
                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label="Anterior"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      aria-label="Próxima"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="px-2 pb-1 text-center">
                <p className="text-sm font-semibold text-white">{current.title}</p>
                {current.description && <p className="mt-0.5 text-xs text-white/60">{current.description}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
