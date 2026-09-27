"use client";

import { Check, GitCompareArrows } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useCompare } from "./CompareProvider";

export function CompareToggle({ product, className }: { product: CatalogProduct; className?: string }) {
  const compare = useCompare();
  const on = compare.has(product.slug);
  return (
    <button
      type="button"
      onClick={() => compare.toggle(product)}
      disabled={!on && compare.isFull}
      aria-pressed={on}
      title={!on && compare.isFull ? "Limite de 3 equipamentos na comparação" : undefined}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-[10px] border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        on ? "border-le-ink bg-le-ink text-white" : "border-le-line bg-white text-le-text hover:border-le-blue-border hover:text-le-blue",
        className,
      )}
    >
      {on ? <Check size={16} /> : <GitCompareArrows size={16} />}
      {on ? "Na comparação" : "Comparar"}
    </button>
  );
}
