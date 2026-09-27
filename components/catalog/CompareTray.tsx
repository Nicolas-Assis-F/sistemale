"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, GitCompareArrows, Plus, X } from "lucide-react";
import { COMPARE_MAX, useCompare } from "./CompareProvider";
import { cn } from "@/lib/utils";

/** Dock flutuante com a seleção de comparação. Some na própria página do comparador. */
export function CompareTray() {
  const { items, remove, clear, compareHref } = useCompare();
  const pathname = usePathname();
  const visible = items.length > 0 && !pathname.startsWith("/vitrine/comparar");
  const ready = items.length >= 2;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          role="region"
          aria-label="Comparação de equipamentos"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-2xl pr-16 transition-transform duration-300 in-data-[sticky-cta=on]:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:inset-x-6 lg:pr-0 lg:in-data-[sticky-cta=on]:bottom-6"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-le-ink/95 p-2 text-white sm:gap-3 sm:pl-4 shadow-[0_24px_60px_-12px_rgb(11_10_59/0.6)] supports-backdrop-filter:backdrop-blur-xl">
            <div className="hidden items-center gap-2 text-xs font-medium text-white/70 sm:flex">
              <GitCompareArrows className="h-4 w-4 text-le-blue-light" />
              Comparar
            </div>
            <ul className="flex flex-1 items-center gap-2">
              {Array.from({ length: COMPARE_MAX }).map((_, i) => {
                const item = items[i];
                return (
                  <li key={item?.slug ?? `slot-${i}`} className="min-w-0 md:flex-1">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {item ? (
                        <m.div
                          key={item.slug}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="group relative flex h-12 items-center gap-2 rounded-xl bg-white/[0.07] p-1 md:pr-7"
                        >
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                            {item.image && (
                              <Image src={item.image} alt="" fill sizes="40px" className="object-contain p-1" />
                            )}
                          </span>
                          <span className="hidden min-w-0 md:block">
                            <span className="block truncate text-[11px] font-medium">{item.name}</span>
                            <span className="block truncate font-mono text-[11px] text-white/70">{item.sku}</span>
                          </span>
                          <button
                            onClick={() => remove(item.slug)}
                            aria-label={`Remover ${item.name} da comparação`}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-le-ink shadow transition-colors md:right-1 md:top-1/2 md:-translate-y-1/2 md:rounded-md md:bg-transparent md:text-white/70 md:shadow-none md:hover:bg-white/10 md:hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </m.div>
                      ) : (
                        <m.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 text-[11px] text-white/70 md:w-auto"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Adicionar</span>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={clear}
              className="hidden text-[11px] text-white/70 transition-colors hover:text-white sm:block"
            >
              Limpar
            </button>
            <Link
              href={ready ? compareHref : "#"}
              aria-disabled={!ready}
              onClick={(e) => !ready && e.preventDefault()}
              className={cn(
                "ml-auto flex h-12 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-[transform,opacity] sm:px-4",
                ready
                  ? "bg-le-yellow text-le-ink hover:bg-le-yellow hover:shadow-[0_8px_24px_-6px_rgb(247_205_71/0.6)]"
                  : "cursor-not-allowed bg-white/10 text-white/70",
              )}
            >
              <span className="hidden sm:inline">{ready ? "Comparar agora" : "Escolha mais 1"}</span>
              <span className="sm:hidden">{items.length}/{COMPARE_MAX}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
