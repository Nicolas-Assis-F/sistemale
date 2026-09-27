"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, m } from "motion/react";
import {
  ArrowDownToLine, ArrowUpRight, LayoutGrid, PackageSearch, Rows3, Search, SlidersHorizontal, X,
} from "lucide-react";
import { MotionProductCard } from "./MotionProductCard";
import dynamic from "next/dynamic";
const ProductQuickView = dynamic(() => import("./ProductQuickView").then((module) => module.ProductQuickView));
import { SpecIcon } from "./icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CatalogProduct } from "@/lib/catalog";
import {
  FACET_PARAM_PREFIX, buildFacets, matchesFacets, matchesQuery, parseSpecNumber,
  type Facet, type FacetSelection,
} from "@/lib/catalog-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { cn } from "@/lib/utils";

type View = "grid" | "row";

interface Props {
  products: CatalogProduct[];
  initialCategory?: string;
  initialQuery?: string;
  initialFacets?: FacetSelection;
  initialSort?: string;
  initialView?: View;
}

export function CatalogExplorer({
  products,
  initialCategory = "",
  initialQuery = "",
  initialFacets = {},
  initialSort = "relevancia",
  initialView = "grid",
}: Props) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [facets, setFacets] = useState<FacetSelection>(initialFacets);
  const [sort, setSort] = useState(initialSort);
  const [view, setView] = useState<View>(initialView);
  const [preview, setPreview] = useState<CatalogProduct | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  function openPreview(product: CatalogProduct) { setPreviewLoaded(true); setPreview(product); }
  const [mobileFilters, setMobileFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of products) {
      const c = map.get(p.category.slug) ?? { ...p.category, count: 0 };
      c.count++;
      map.set(p.category.slug, c);
    }
    return [...map.values()];
  }, [products]);

  // Base = categoria + busca; as facetas se adaptam a esse recorte
  const base = useMemo(
    () => products.filter((p) => (!category || p.category.slug === category) && matchesQuery(p, query)),
    [products, category, query],
  );
  const facetList = useMemo(() => buildFacets(base, facets), [base, facets]);

  const numericSorts = useMemo(
    () => facetList.filter((f) => f.options.every((o) => parseSpecNumber(o.value) !== null)).slice(0, 2),
    [facetList],
  );

  const filtered = useMemo(() => {
    const list = base.filter((p) => matchesFacets(p, facets));
    const specKey = sort.startsWith("spec:") ? sort.slice(5) : null;
    return list.sort((a, b) => {
      if (specKey) {
        const na = a.specs[specKey] ? parseSpecNumber(a.specs[specKey]) : null;
        const nb = b.specs[specKey] ? parseSpecNumber(b.specs[specKey]) : null;
        return (nb ?? -Infinity) - (na ?? -Infinity);
      }
      if (sort === "nome") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "preco") return (a.priceCents || Infinity) - (b.priceCents || Infinity);
      return Number(b.featured) - Number(a.featured);
    });
  }, [base, facets, sort]);

  const activeFacetCount = Object.values(facets).reduce((n, v) => n + v.length, 0);
  const hasFilters = !!category || !!query || activeFacetCount > 0;

  function toggleFacet(key: string, value: string) {
    setFacets((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const copy = { ...prev, [key]: next };
      if (!next.length) delete copy[key];
      return copy;
    });
  }
  function selectCategory(slug: string) {
    setCategory(slug);
    setFacets({}); // facetas dependem da linha escolhida
  }
  function clearAll() {
    setCategory("");
    setQuery("");
    setFacets({});
  }

  // Estado ↔ URL (compartilhável, sem recarregar a página)
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("categoria", category);
    if (query) params.set("q", query);
    if (sort !== "relevancia") params.set("ordem", sort);
    if (view !== "grid") params.set("visual", view);
    for (const [k, values] of Object.entries(facets)) values.forEach((v) => params.append(FACET_PARAM_PREFIX + k, v));
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [category, query, facets, sort, view]);

  // "/" foca a busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const facetPanel = (
    <FacetPanel facets={facetList} selection={facets} onToggle={toggleFacet} onClear={() => setFacets({})} />
  );

  return (
    <>
      {/* Introdução */}
      <section className="le-catalog-intro">
        <div className="le-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="le-kicker">Precisão em cada escolha</p>
              <h1 className="le-title mt-4">
                O próximo passo
                <br />
                da sua <span className="text-le-blue">operação.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-le-muted">
                Filtre por especificação técnica, compare lado a lado e baixe a ficha de cada equipamento.
              </p>
            </div>
            <a href="/catalogo/catalogo-letorneadora.pdf" target="_blank" rel="noopener noreferrer" className="le-button le-button-outline">
              <ArrowDownToLine size={16} /> Catálogo completo (PDF)
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-2 text-[11px] font-medium text-le-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-le-blue" />
            {products.length} referências técnicas
            <span className="mx-2">/</span>
            {categories.length} linhas de produtos
            <span className="mx-2">/</span>Atendimento direto com a fábrica
          </div>
        </div>
      </section>

      {/* Barra de ferramentas fixa */}
      <div className="sticky top-22 z-30 border-b border-le-line bg-white/85 supports-backdrop-filter:backdrop-blur-xl">
        <div className="le-container flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
          <div className="le-rail -mx-1 flex-1 auto-cols-max gap-1.5 px-1 pb-0" role="tablist" aria-label="Linhas de produtos">
            {[{ slug: "", name: "Todos", count: products.length }, ...categories].map((c) => {
              const active = category === c.slug;
              return (
                <button
                  key={c.slug || "all"}
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectCategory(c.slug)}
                  className={cn(
                    "relative flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-colors",
                    active ? "text-white" : "text-le-muted hover:bg-le-subtle hover:text-le-text",
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="le-cat-pill"
                      className="absolute inset-0 rounded-full bg-le-ink"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <span className="relative">{c.name}</span>
                  <span className={cn("relative font-mono text-[11px] tabular-nums", active ? "text-white/55" : "text-le-muted")}>{c.count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-le-muted" />
              <input
                ref={searchRef}
                aria-label="Buscar na vitrine"
                placeholder="Buscar: torque, 2 3/8, PDC…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-le-line bg-white pl-10 pr-9 text-[13px] outline-none transition-shadow placeholder:text-le-muted focus:border-le-blue focus:shadow-[0_0_0_4px_rgb(49_88_239/0.12)]"
              />
              {query ? (
                <button aria-label="Limpar busca" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-le-muted hover:text-le-text">
                  <X size={14} />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-le-line px-1.5 font-mono text-[11px] text-le-muted sm:block">/</kbd>
              )}
            </div>
            <button
              onClick={() => setMobileFilters(true)}
              className="relative flex h-10 items-center gap-2 rounded-xl border border-le-line bg-white px-3 text-xs font-medium text-le-text lg:hidden"
            >
              <SlidersHorizontal size={15} /> Filtros
              {activeFacetCount > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-le-blue px-1 text-[11px] text-white">{activeFacetCount}</span>
              )}
            </button>
            <select
              aria-label="Ordenar produtos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hidden h-10 rounded-xl border border-le-line bg-white px-3 text-xs text-le-muted outline-none focus:border-le-blue sm:block"
            >
              <option value="relevancia">Destaques primeiro</option>
              <option value="nome">Nome: A–Z</option>
              <option value="preco">Menor preço</option>
              {numericSorts.map((f) => (
                <option key={f.key} value={`spec:${f.key}`}>Maior {f.key.toLowerCase()}</option>
              ))}
            </select>
            <div className="hidden rounded-xl border border-le-line bg-white p-0.5 sm:flex" role="radiogroup" aria-label="Modo de visualização">
              {([["grid", LayoutGrid, "Grade"], ["row", Rows3, "Lista técnica"]] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={view === v}
                  aria-label={label}
                  title={label}
                  onClick={() => setView(v)}
                  className={cn("flex h-8.5 w-9 items-center justify-center rounded-[10px] transition-colors", view === v ? "bg-le-ink text-white" : "text-le-muted hover:text-le-text")}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="le-container py-8 lg:py-12">
        <div className="grid items-start gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
          {/* Facetas (desktop) */}
          <aside className="hidden lg:sticky lg:top-44 lg:block">
            {facetPanel}
            <div className="mt-8 rounded-2xl bg-le-ink p-5 text-white">
              <span className="mb-6 block h-1 w-6 rounded bg-le-yellow" />
              <h2 className="font-heading text-lg font-medium leading-snug">
                Uma dúvida técnica?
                <br />
                Fale com quem fabrica.
              </h2>
              <p className="mt-3 text-xs leading-6 text-white/70">Nossa equipe ajuda você a escolher a configuração ideal.</p>
              <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center justify-between text-xs font-medium">
                Conversar com a L&E <ArrowUpRight size={15} />
              </a>
            </div>
          </aside>

          <div className="min-w-0">
            {/* Resultado + filtros ativos */}
            <div className="mb-5 flex min-h-8 flex-wrap items-center gap-2 text-xs text-le-muted">
              <p aria-live="polite" className="mr-2">
                <m.strong key={filtered.length} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-le-text">
                  {filtered.length}
                </m.strong>{" "}
                {filtered.length === 1 ? "equipamento" : "equipamentos"}
              </p>
              <AnimatePresence initial={false}>
                {Object.entries(facets).flatMap(([k, values]) =>
                  values.map((v) => (
                    <m.button
                      layout
                      key={k + v}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => toggleFacet(k, v)}
                      className="flex items-center gap-1.5 rounded-full border border-le-line bg-le-subtle py-1 pl-2.5 pr-1.5 text-[11px] text-le-text hover:border-le-blue"
                    >
                      <span className="text-le-blue-light">{k}:</span> {v} <X size={12} />
                    </m.button>
                  )),
                )}
              </AnimatePresence>
              {hasFilters && (
                <button onClick={clearAll} className="ml-auto flex items-center gap-1 font-medium text-le-blue hover:underline">
                  Limpar tudo <X size={13} />
                </button>
              )}
            </div>

            <LayoutGroup>
              <m.div layout className={cn("grid gap-5", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {filtered.map((p, i) => (
                    <MotionProductCard key={p.id} product={p} index={i} variant={view} onPreview={openPreview} />
                  ))}
                </AnimatePresence>
              </m.div>
            </LayoutGroup>

            {filtered.length === 0 && (
              <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-dashed border-le-line bg-white p-12 text-center">
                <PackageSearch size={36} className="mx-auto text-le-muted" />
                <h2 className="mt-5 font-heading text-xl">Não encontramos essa combinação.</h2>
                <p className="mt-2 text-sm text-muted-foreground">Remova um filtro ou fale com a engenharia — fabricamos sob medida.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button onClick={clearAll} className="le-button le-button-dark">Ver todos os produtos</button>
                  <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="le-button le-button-outline">
                    Pedir um projeto especial
                  </a>
                </div>
              </m.div>
            )}
          </div>
        </div>
      </section>

      {/* Filtros (mobile) */}
      <Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filtrar equipamentos</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <label className="mb-5 block text-xs font-medium text-le-muted">
              Ordenar por
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-le-line bg-white px-3 text-sm"
              >
                <option value="relevancia">Destaques primeiro</option>
                <option value="nome">Nome: A–Z</option>
                <option value="preco">Menor preço</option>
                {numericSorts.map((f) => (
                  <option key={f.key} value={`spec:${f.key}`}>Maior {f.key.toLowerCase()}</option>
                ))}
              </select>
            </label>
            {facetPanel}
          </div>
          <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button onClick={() => setMobileFilters(false)} className="le-button le-button-blue w-full">
              Ver {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {previewLoaded && <ProductQuickView product={preview} products={filtered} onNavigate={setPreview} onClose={() => setPreview(null)} />}
    </>
  );
}

function FacetPanel({
  facets,
  selection,
  onToggle,
  onClear,
}: {
  facets: Facet[];
  selection: FacetSelection;
  onToggle: (key: string, value: string) => void;
  onClear: () => void;
}) {
  if (!facets.length) {
    return (
      <p className="rounded-2xl border border-dashed border-le-line p-4 text-xs leading-5 text-le-muted">
        Selecione uma linha para ver filtros por especificação técnica.
      </p>
    );
  }
  const anySelected = Object.keys(selection).length > 0;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-le-muted">Especificações</p>
        {anySelected && (
          <button onClick={onClear} className="text-[11px] font-medium text-le-blue hover:underline">
            Limpar
          </button>
        )}
      </div>
      <div className="space-y-5">
        {facets.map((f) => (
          <fieldset key={f.key}>
            <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-le-text">
              <SpecIcon specKey={f.key} size={13} className="text-le-blue" /> {f.key}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {f.options.map((o) => {
                const on = selection[f.key]?.includes(o.value) ?? false;
                const disabled = !on && o.count === 0;
                return (
                  <button
                    key={o.value}
                    onClick={() => onToggle(f.key, o.value)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-[transform,opacity] active:scale-95",
                      on
                        ? "border-le-blue bg-le-blue text-white shadow-[0_4px_12px_-4px_rgb(49_88_239/0.6)]"
                        : "border-le-line bg-white text-le-text hover:border-le-blue-border hover:text-le-text",
                      disabled && "pointer-events-none opacity-35",
                    )}
                  >
                    {o.value}
                    <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-white/65" : "text-le-muted")}>{o.count}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
