"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { FileDown } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { WhatsAppIcon } from "./icons";

/**
 * CTA fixo da página de produto. Um sentinel invisível fica logo após o CTA
 * principal; quando ele sai pelo topo da tela, a barra aparece:
 * desktop → faixa de vidro sob o header; mobile → barra inferior (thumb-zone).
 * Marca <html data-sticky-cta="on"> para o dock de comparação e o botão
 * flutuante do WhatsApp abrirem espaço.
 */
export function ProductStickyCTA({ product }: { product: Pick<CatalogProduct, "slug" | "sku" | "name" | "images" | "category"> }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // Visível quando o sentinel passou por cima da área útil (abaixo do header de 88px).
    // Compara com rootBounds.top, não com 0: com rootMargin negativo ele sai com top ainda positivo.
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)), {
      rootMargin: "-88px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.stickyCta = visible ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.stickyCta;
    };
  }, [visible]);

  const whatsapp = buildWhatsAppUrl({ sku: product.sku, productName: product.name });
  const ficha = `/vitrine/${product.slug}/ficha-tecnica`;

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <AnimatePresence>
        {visible && (
          <>
            {/* Desktop: faixa sob o header */}
            <m.div
              key="desk"
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 top-22 z-30 hidden border-b border-le-line bg-white/85 shadow-[0_12px_30px_-18px_rgb(11_10_59/0.35)] supports-backdrop-filter:backdrop-blur-xl lg:block"
            >
              <div className="le-container flex h-16 items-center gap-4">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-le-line bg-le-subtle">
                  {product.images[0] && <Image src={product.images[0]} alt="" fill sizes="44px" className="object-contain p-1 mix-blend-multiply" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-heading text-[15px] font-semibold tracking-[-0.03em] text-le-text">{product.name}</p>
                  <p className="text-[11px] text-le-muted">
                    {product.category.name} · <span className="font-mono">{product.sku}</span>
                  </p>
                </div>
                <nav className="ml-6 hidden items-center gap-5 text-xs text-le-muted xl:flex" aria-label="Seções do produto">
                  <a href="#ficha" className="transition-colors hover:text-le-blue">Especificações</a>
                  <a href="#detalhes" className="transition-colors hover:text-le-blue">Sobre o equipamento</a>
                </nav>
                <div className="ml-auto flex items-center gap-2">
                  <a
                    href={ficha}
                    download
                    className="flex h-10 items-center gap-2 rounded-xl border border-le-line bg-white px-4 text-xs font-medium text-le-text transition-colors hover:border-le-blue-border hover:text-le-blue"
                  >
                    <FileDown size={15} /> Ficha técnica
                  </a>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center gap-2 rounded-xl bg-le-whatsapp-strong px-5 text-xs font-semibold text-white shadow-[0_8px_20px_-8px_rgb(31_170_89/0.9)] transition-colors hover:bg-le-whatsapp-strong/90"
                  >
                    <WhatsAppIcon className="h-4 w-4" /> Falar com especialista
                  </a>
                </div>
              </div>
            </m.div>

            {/* Mobile: barra inferior */}
            <m.div
              key="mob"
              initial={{ y: 90 }}
              animate={{ y: 0 }}
              exit={{ y: 90 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-40 border-t border-le-line bg-white/92 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(11_10_59/0.35)] supports-backdrop-filter:backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-le-text">{product.name}</p>
                  <p className="font-mono text-[11px] text-le-muted">{product.sku}</p>
                </div>
                <a
                  href={ficha}
                  download
                  aria-label="Baixar ficha técnica (PDF)"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-le-line text-le-text"
                >
                  <FileDown size={17} />
                </a>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center gap-2 rounded-xl bg-le-whatsapp-strong px-4 text-[13px] font-semibold text-white"
                >
                  <WhatsAppIcon className="h-4 w-4" /> Especialista
                </a>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
