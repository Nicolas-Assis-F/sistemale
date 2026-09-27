"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { COMPARE_MAX } from "@/lib/catalog-utils";

export { COMPARE_MAX };
const STORAGE_KEY = "le-compare-v1";

export interface CompareItem {
  slug: string;
  name: string;
  sku: string;
  image?: string;
  category: string;
}

interface CompareContextValue {
  items: CompareItem[];
  has: (slug: string) => boolean;
  toggle: (product: CatalogProduct) => "added" | "removed" | "full";
  remove: (slug: string) => void;
  /** Substitui a seleção inteira (usado pelo comparador, onde a URL manda). */
  replace: (products: CatalogProduct[]) => void;
  clear: () => void;
  isFull: boolean;
  compareHref: string;
}

const CompareContext = createContext<CompareContextValue | null>(null);

const toItem = (p: CatalogProduct): CompareItem => ({
  slug: p.slug, name: p.name, sku: p.sku, image: p.images[0], category: p.category.name,
});

export function compareUrl(slugs: string[]) {
  return `/vitrine/comparar?itens=${slugs.map(encodeURIComponent).join(",")}`;
}

/** Seleção de até 3 equipamentos para comparar, lembrada entre páginas (localStorage). */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) setItems(saved.slice(0, COMPARE_MAX));
    } catch {
      /* storage indisponível: segue sem persistência */
    }
  }, []);

  // Updates funcionais: cliques em sequência rápida não se sobrescrevem
  const update = useCallback((fn: (prev: CompareItem[]) => CompareItem[]) => {
    setItems((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
      return next;
    });
  }, []);

  const has = useCallback((slug: string) => items.some((i) => i.slug === slug), [items]);

  const toggle = useCallback(
    (p: CatalogProduct) => {
      const result = items.some((i) => i.slug === p.slug) ? "removed" : items.length >= COMPARE_MAX ? "full" : "added";
      update((prev) => {
        if (prev.some((i) => i.slug === p.slug)) return prev.filter((i) => i.slug !== p.slug);
        if (prev.length >= COMPARE_MAX) return prev;
        return [...prev, toItem(p)];
      });
      return result;
    },
    [items, update],
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      has,
      toggle,
      remove: (slug) => update((prev) => prev.filter((i) => i.slug !== slug)),
      replace: (products) => update(() => products.slice(0, COMPARE_MAX).map(toItem)),
      clear: () => update(() => []),
      isFull: items.length >= COMPARE_MAX,
      compareHref: compareUrl(items.map((i) => i.slug)),
    }),
    [items, has, toggle, update],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare precisa estar dentro de <CompareProvider>");
  return ctx;
}
