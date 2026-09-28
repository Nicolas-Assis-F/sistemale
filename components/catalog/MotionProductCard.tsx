"use client";

import { useRef, type PointerEvent, type Ref } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Eye, GitCompareArrows, Package } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import type { CatalogProduct } from "@/lib/catalog";
import { keySpecs, shortSpecLabel } from "@/lib/catalog-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { getProductOffer } from "@/lib/catalog-offers";
import { ProductPrice } from "./ProductPrice";
import { cn } from "@/lib/utils";
import { SpecIcon, WhatsAppIcon } from "./icons";
import { useCompare } from "./CompareProvider";

interface Props {
  product: CatalogProduct;
  onPreview?: (product: CatalogProduct, trigger: HTMLButtonElement) => void;
  index?: number;
  variant?: "grid" | "row";
  className?: string;
  imageSizes?: string;
  /** React 19: ref como prop — necessário para AnimatePresence mode="popLayout". */
  ref?: Ref<HTMLElement>;
}

/** Motion no layout; hover em CSS. Preços e ações permanecem visíveis em todos os dispositivos. */
export function MotionProductCard({ product, onPreview, index = 0, variant = "grid", className, imageSizes, ref }: Props) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const compare = useCompare();
  const inCompare = compare.has(product.slug);
  const specs = keySpecs(product, 3);
  const href = `/vitrine/${product.slug}`;
  const offer = getProductOffer(product);
  const whatsapp = buildWhatsAppUrl({ sku: product.sku, productName: product.name });

  // Spotlight + tilt via CSS vars: sem re-render do React a cada movimento
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduced || e.pointerType !== "mouse" || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    stageRef.current.style.setProperty("--mx", `${x * 100}%`);
    stageRef.current.style.setProperty("--my", `${y * 100}%`);
    stageRef.current.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    stageRef.current.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
  }
  function onPointerLeave() {
    stageRef.current?.style.setProperty("--rx", "0deg");
    stageRef.current?.style.setProperty("--ry", "0deg");
  }

  const compareButton = (
    <button
      type="button"
      onClick={() => compare.toggle(product)}
      disabled={!inCompare && compare.isFull}
      aria-pressed={inCompare}
      aria-label={`${inCompare ? "Remover da comparação" : "Comparar"}: ${product.name}`}
      title={!inCompare && compare.isFull ? "Limite de 3 equipamentos" : "Comparar equipamentos"}
      className={cn("le-mcard-compare", inCompare && "is-on")}
    >
      <span className="le-mcard-compare-box">{inCompare ? <Check size={11} strokeWidth={3} /> : <GitCompareArrows size={11} />}</span>
      <span>{inCompare ? "Comparando" : "Comparar"}</span>
    </button>
  );

  const image = product.images[0] ? (
    <Image
      src={product.images[0]}
      alt={product.name}
      fill
      sizes={imageSizes ?? (variant === "row" ? "(max-width:639px) calc(100vw - 84px), 170px" : "(max-width:639px) calc(100vw - 84px), (max-width:1023px) calc(50vw - 84px), (max-width:1279px) calc(50vw - 224px), 290px")}
      className="le-mcard-img"
    />
  ) : (
    <Package className="absolute left-1/2 top-1/2 -translate-1/2 text-slate-300" size={56} />
  );

  return (
    <m.article
      ref={ref}
      layout={reduced ? false : "position"}
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{
        layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        default: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.03 },
      }}
      data-offer={offer ? true : undefined}
      className={cn("le-mcard group", variant === "row" && "le-mcard-row", className)}
    >
      {/* Palco da imagem */}
      <div ref={stageRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className="le-mcard-stage">
        <span className="le-mcard-spot" aria-hidden />
        <span className="le-mcard-floor" aria-hidden />
        {onPreview ? (
          <button
            type="button"
            onClick={(event) => onPreview(product, event.currentTarget)}
            aria-label={`Visualização rápida: ${product.name}`}
            className="le-mcard-hit"
          >
            <span className="le-mcard-tilt">{image}</span>
          </button>
        ) : (
          <Link href={href} aria-label={`Conhecer ${product.name}`} className="le-mcard-hit">
            <span className="le-mcard-tilt">{image}</span>
          </Link>
        )}

        <span className="le-mcard-tag">{product.category.name}</span>
        {variant === "grid" && compareButton}
        {(offer || product.featured) && <span className={cn("le-mcard-badge", offer && "is-offer")}>
          {offer ? (offer.percent > 0 ? `−${offer.percent}% · Oferta` : "Oferta especial") : "Destaque da fábrica"}
        </span>}

        {onPreview && variant === "grid" && (
          <span className="le-mcard-peek" aria-hidden>
            <Eye size={13} /> Visualização rápida
          </span>
        )}
      </div>

      {/* Corpo */}
      <div className="le-mcard-body">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="le-mcard-title">
            {product.name}
          </Link>
          <span className="le-mcard-sku">{product.sku}</span>
        </div>
        <p className="le-mcard-desc">{product.shortDesc}</p>

        {/* Especificações sempre disponíveis, inclusive por teclado e toque. */}
        {specs.length > 0 && (
          <ul className="le-mcard-chips">
            {specs.map((s) => (
              <li key={s.key}>
                <SpecIcon specKey={s.key} size={11} />
                <span className="text-le-muted">{shortSpecLabel(s.key)}</span> {s.value}
              </li>
            ))}
          </ul>
        )}

        <div className="le-mcard-foot">
          <ProductPrice product={product} />
          <div className="le-mcard-actions">
            {variant === "row" && compareButton}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="le-mcard-cta" aria-label={`Cotar agora: ${product.name} pelo WhatsApp`}>
              <WhatsAppIcon className="h-3.5 w-3.5" /> Cotar agora
            </a>
            <Link href={href} className="le-mcard-more" aria-label={`Detalhes de ${product.name}`}>
              <span className="le-mcard-more-label">Detalhes</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </m.article>
  );
}
