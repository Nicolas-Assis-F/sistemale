"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { MotionProductCard } from "./MotionProductCard";
import dynamic from "next/dynamic";
const ProductQuickView = dynamic(() => import("./ProductQuickView").then((module) => module.ProductQuickView));

/**
 * Destaques da home: trilho com snap nativo no mobile (sem carrossel com cliques),
 * grade no desktop; clique no produto abre o Quick View.
 */
export function FeaturedShowcase({ products }: { products: CatalogProduct[] }) {
  const [preview, setPreview] = useState<CatalogProduct | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  function openPreview(product: CatalogProduct) { setPreviewLoaded(true); setPreview(product); }
  return (
    <>
      <div className="le-rail -mx-4.5 px-4.5 sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {products.map((p, i) => (
          <MotionProductCard key={p.id} product={p} index={i} onPreview={openPreview} />
        ))}
      </div>
      {previewLoaded && <ProductQuickView product={preview} products={products} onNavigate={setPreview} onClose={() => setPreview(null)} />}
    </>
  );
}
