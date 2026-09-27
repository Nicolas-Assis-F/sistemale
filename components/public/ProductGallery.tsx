"use client";
import { useState } from "react";
import Image from "next/image";
import { ZoomIn, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
export function ProductGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  if (!images.length)
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted">
        <Package size={60} className="text-muted-foreground" />
      </div>
    );
  const shift = (d: number) =>
    setSelected((i) => (i + d + images.length) % images.length);
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-le-line bg-white">
        <button
          onClick={() => setOpen(true)}
          aria-label={`Ampliar foto de ${productName}`}
          className="absolute inset-0 group"
        >
          <Image
            key={selected}
            src={images[selected]}
            alt={productName}
            fill
            preload={selected === 0}
            sizes="(max-width:768px) 95vw,50vw"
            className="object-contain p-8 transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-[11px] text-muted-foreground">
            <ZoomIn size={14} /> Ampliar imagem
          </span>
        </button>
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setSelected(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-pressed={selected === i}
              className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white ${selected === i ? "border-primary" : "border-transparent"}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle className="sr-only">{productName} — galeria</DialogTitle>
          <div className="relative h-[70dvh]">
            <Image
              src={images[selected]}
              alt={productName}
              fill
              sizes="90vw"
              className="object-contain p-4"
            />
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => shift(-1)}
                aria-label="Foto anterior"
                className="rounded-lg border p-2"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs">
                {selected + 1} / {images.length}
              </span>
              <button
                onClick={() => shift(1)}
                aria-label="Próxima foto"
                className="rounded-lg border p-2"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
