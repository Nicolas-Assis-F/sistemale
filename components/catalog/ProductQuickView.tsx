"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowUpRight, Check, ChevronLeft, ChevronRight, FileDown, GitCompareArrows, Package, X,
} from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { keySpecs, shortSpecLabel } from "@/lib/catalog-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SpecIcon, WhatsAppIcon } from "./icons";
import { useCompare } from "./CompareProvider";

interface Props {
  product: CatalogProduct | null;
  /** Lista visível (filtrada) — habilita navegar entre produtos sem fechar o modal. */
  products?: CatalogProduct[];
  onNavigate?: (product: CatalogProduct) => void;
  onClose: () => void;
}

/**
 * Visualização rápida: tudo o que um engenheiro precisa para decidir, a um clique
 * do card — fotos, especificações completas, ficha técnica em PDF e o CTA de venda.
 * Desktop: modal central. Mobile: bottom sheet de altura quase total.
 */
export function ProductQuickView({ product, products = [], onNavigate, onClose }: Props) {
  const [current, setCurrent] = useState<CatalogProduct | null>(product);
  // Mantém o conteúdo durante a animação de saída
  useEffect(() => {
    if (product) setCurrent(product);
  }, [product]);

  const position = current ? products.findIndex((p) => p.id === current.id) : -1;
  const go = (d: number) => {
    if (position === -1 || products.length < 2) return;
    onNavigate?.(products[(position + d + products.length) % products.length]);
  };

  return (
    <DialogPrimitive.Root open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-le-ink-deep/55 duration-300 supports-backdrop-filter:backdrop-blur-[6px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-white text-le-text outline-none",
            "inset-x-0 bottom-0 h-[94dvh] rounded-t-[26px] duration-300 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
            "md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(720px,90dvh)] md:w-[min(1080px,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-[0.97] md:data-closed:slide-out-to-bottom-0 md:data-closed:zoom-out-[0.97]",
            "shadow-[0_40px_120px_-30px_rgb(7_6_43/0.6)]",
          )}
          onKeyDown={(e) => {
            if (e.target instanceof HTMLInputElement) return;
            if (e.key === "]" || (e.key === "ArrowRight" && e.shiftKey)) go(1);
            if (e.key === "[" || (e.key === "ArrowLeft" && e.shiftKey)) go(-1);
          }}
        >
          {current && <QuickViewBody key={current.id} product={current} position={position} total={products.length} onStep={go} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function QuickViewBody({
  product,
  position,
  total,
  onStep,
}: {
  product: CatalogProduct;
  position: number;
  total: number;
  onStep: (d: number) => void;
}) {
  const [img, setImg] = useState(0);
  const [dir, setDir] = useState(1);
  const compare = useCompare();
  const inCompare = compare.has(product.slug);
  const images = product.images;
  const specs = Object.entries(product.specs);
  const highlights = keySpecs(product, 3);

  const shift = (d: number) => {
    if (images.length < 2) return;
    setDir(d);
    setImg((i) => (i + d + images.length) % images.length);
  };

  return (
    <div
      className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[1.08fr_1fr] md:grid-rows-1"
      onKeyDown={(e) => {
        if (e.shiftKey) return;
        if (e.key === "ArrowRight") shift(1);
        if (e.key === "ArrowLeft") shift(-1);
      }}
    >
      {/* Galeria */}
      <div className="relative flex flex-col bg-[radial-gradient(120%_80%_at_50%_110%,#e3e7f6,transparent_60%),#f5f6fb]">
        <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-le-ink/15 md:hidden" aria-hidden />
        <div className="relative h-[34dvh] md:h-auto md:flex-1">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <m.div
              key={img}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: dir * -40, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 mix-blend-multiply"
            >
              {images[img] ? (
                <Image
                  src={images[img]}
                  alt={`${product.name} — foto ${img + 1}`}
                  fill
                  sizes="(max-width:768px) 100vw, 560px"
                  className="object-contain p-8 md:p-12"
                />
              ) : (
                <Package className="absolute left-1/2 top-1/2 -translate-1/2 text-slate-300" size={72} />
              )}
            </m.div>
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <GalleryArrow side="left" onClick={() => shift(-1)} />
              <GalleryArrow side="right" onClick={() => shift(1)} />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-2.5 py-1 font-mono text-[11px] text-le-muted backdrop-blur md:hidden">
                {img + 1}/{images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="hidden gap-2 px-6 pb-6 md:flex">
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => { setDir(i > img ? 1 : -1); setImg(i); }}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === img}
                className={cn(
                  "relative h-16 w-16 overflow-hidden rounded-xl border-2 bg-white transition-[transform,opacity]",
                  i === img ? "border-le-blue shadow-[0_6px_16px_-6px_rgb(49_88_239/0.6)]" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-contain p-1.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-le-line px-5 py-3 md:px-7 md:py-4">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-le-blue">
            {product.category.name} <span className="px-1.5 text-[#c9cbe0]">/</span>
            <span className="font-mono tracking-normal text-le-muted">{product.sku}</span>
          </p>
          <div className="flex items-center gap-1">
            {total > 1 && position !== -1 && (
              <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-le-line p-0.5 sm:flex">
                <button onClick={() => onStep(-1)} aria-label="Produto anterior" className="flex h-7 w-7 items-center justify-center rounded-md text-le-muted hover:bg-le-subtle hover:text-le-text">
                  <ChevronLeft size={15} />
                </button>
                <span className="px-1 font-mono text-[11px] tabular-nums text-le-muted">{position + 1}/{total}</span>
                <button onClick={() => onStep(1)} aria-label="Próximo produto" className="flex h-7 w-7 items-center justify-center rounded-md text-le-muted hover:bg-le-subtle hover:text-le-text">
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
            <DialogPrimitive.Close aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-xl text-le-muted transition-colors hover:bg-le-subtle hover:text-le-text">
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 md:px-7">
          <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <DialogPrimitive.Title className="font-heading text-[28px] font-medium leading-[1.1] tracking-[-0.045em] md:text-[34px]">
              {product.name}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-sm leading-6 text-le-muted">
              {product.shortDesc}
            </DialogPrimitive.Description>
          </m.div>

          {highlights.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {highlights.map((s, i) => (
                <m.div
                  key={s.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.35 }}
                  className="rounded-2xl border border-le-line bg-linear-to-b from-white to-[#f7f8fc] p-3"
                >
                  <SpecIcon specKey={s.key} size={15} className="text-le-blue" />
                  <p className="mt-2.5 truncate text-[11px] font-medium uppercase tracking-[0.1em] text-le-muted">{shortSpecLabel(s.key)}</p>
                  <p className="mt-0.5 truncate font-heading text-[15px] font-semibold tracking-[-0.02em]">{s.value}</p>
                </m.div>
              ))}
            </div>
          )}

          {specs.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-le-muted">Especificações técnicas</h3>
              <dl className="overflow-hidden rounded-2xl border border-le-line">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 border-b border-le-line px-4 py-2.5 text-[13px] last:border-0 even:bg-le-subtle">
                    <dt className="flex items-center gap-2 text-le-muted">
                      <SpecIcon specKey={k} size={13} className="shrink-0 text-le-muted" /> {k}
                    </dt>
                    <dd className="font-medium text-le-text">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <p className="mt-5 text-[13px] text-le-muted">
            {product.priceCents > 0 ? (
              <>Investimento a partir de <strong className="text-le-text">{formatCurrency(product.priceCents)}</strong>.</>
            ) : (
              <>Valor sob cotação — configuramos conforme sua operação.</>
            )}
          </p>
        </div>

        {/* Ações */}
        <div className="border-t border-le-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-7 md:pb-5">
          <a
            href={buildWhatsAppUrl({ sku: product.sku, productName: product.name })}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-le-whatsapp-strong text-sm font-semibold text-white shadow-[0_12px_28px_-10px_rgb(31_170_89/0.8),inset_0_1px_0_rgb(255_255_255/0.2)] transition-[background-color,transform] hover:bg-le-whatsapp-strong/90 active:scale-[0.99]"
          >
            <WhatsAppIcon className="h-4.5 w-4.5" /> Cotar com um especialista
            <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <a
              href={`/vitrine/${product.slug}/ficha-tecnica`}
              download
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-le-line text-[11.5px] font-medium text-le-text transition-colors hover:border-le-blue-border hover:bg-le-subtle hover:text-le-blue"
            >
              <FileDown size={14} /> Ficha PDF
            </a>
            <button
              onClick={() => compare.toggle(product)}
              disabled={!inCompare && compare.isFull}
              aria-pressed={inCompare}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                inCompare ? "border-le-ink bg-le-ink text-white" : "border-le-line text-le-text hover:border-le-blue-border hover:bg-le-subtle hover:text-le-blue",
              )}
            >
              {inCompare ? <Check size={14} /> : <GitCompareArrows size={14} />}
              {inCompare ? "Comparando" : "Comparar"}
            </button>
            <Link
              href={`/vitrine/${product.slug}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-le-line text-[11.5px] font-medium text-le-text transition-colors hover:border-le-blue-border hover:bg-le-subtle hover:text-le-blue"
            >
              Página completa <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Foto anterior" : "Próxima foto"}
      className={cn(
        "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/80 text-le-text shadow-sm backdrop-blur transition-[transform,opacity] hover:scale-105 hover:bg-white",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <Icon size={18} />
    </button>
  );
}
