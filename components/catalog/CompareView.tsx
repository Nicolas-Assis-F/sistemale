"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowUpRight, Crown, FileDown, Package, Plus, X } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { HIGHER_IS_BETTER, parseSpecNumber } from "@/lib/catalog-utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp-url";
import { cn } from "@/lib/utils";
import { COMPARE_MAX, compareUrl, useCompare } from "./CompareProvider";
import { SpecIcon, WhatsAppIcon } from "./icons";

interface Props {
  selected: CatalogProduct[];
  suggestions: CatalogProduct[];
}

/** Tabela lado a lado: 1ª coluna e cabeçalho fixos, linhas divergentes destacadas. */
export function CompareView({ selected, suggestions }: Props) {
  const router = useRouter();
  const compare = useCompare();
  const [onlyDiff, setOnlyDiff] = useState(false);

  // A URL é a fonte da verdade nesta página; sincroniza a seleção salva com ela
  const { items, replace } = compare;
  useEffect(() => {
    const slugs = selected.map((p) => p.slug);
    const same = items.length === slugs.length && items.every((i) => slugs.includes(i.slug));
    if (!same) replace(selected);
    // `items` nas deps: o provider carrega o localStorage depois deste efeito (efeitos do filho rodam antes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items]);

  const go = (slugs: string[]) => router.replace(compareUrl(slugs), { scroll: false });

  const rows = useMemo(() => {
    const freq = new Map<string, number>();
    selected.forEach((p) => Object.keys(p.specs).forEach((k) => freq.set(k, (freq.get(k) ?? 0) + 1)));
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => {
        const values = selected.map((p) => p.specs[key] ?? null);
        const distinct = new Set(values.map((v) => v ?? "—"));
        const differs = distinct.size > 1;
        let best = -1;
        if (differs && HIGHER_IS_BETTER.test(key)) {
          const nums = values.map((v) => (v ? parseSpecNumber(v) : null));
          const max = Math.max(...nums.map((n) => n ?? -Infinity));
          if (Number.isFinite(max) && nums.filter((n) => n === max).length === 1) best = nums.indexOf(max);
        }
        return { key, values, differs, best };
      });
  }, [selected]);

  const visibleRows = onlyDiff ? rows.filter((r) => r.differs) : rows;
  const diffCount = rows.filter((r) => r.differs).length;
  const cols = selected.length + (selected.length < COMPARE_MAX ? 1 : 0);

  return (
    <div className="le-container pb-28">
      <div className="flex flex-wrap items-end justify-between gap-6 py-10">
        <div>
          <Link href="/vitrine" className="inline-flex items-center gap-2 text-[11px] text-le-muted hover:text-le-blue">
            <ArrowLeft size={13} /> Voltar à vitrine
          </Link>
          <p className="le-kicker mt-6">Comparador técnico</p>
          <h1 className="le-section-title mt-3">Lado a lado, sem achismo.</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-le-muted">
            {selected.length < 2
              ? "Escolha pelo menos dois equipamentos para ver as diferenças."
              : `${diffCount} de ${rows.length} especificações diferem entre os modelos selecionados.`}
          </p>
        </div>
        {selected.length >= 2 && (
          <label className="flex cursor-pointer select-none items-center gap-3 rounded-xl border border-le-line bg-white px-4 py-2.5 text-xs font-medium text-le-text">
            <span className={cn("relative h-5 w-9 rounded-full transition-colors", onlyDiff ? "bg-le-blue" : "bg-le-line")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] duration-200", onlyDiff ? "left-4.5" : "left-0.5")} />
            </span>
            <input type="checkbox" className="sr-only" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
            Mostrar só diferenças
          </label>
        )}
      </div>

      <div className="-mx-4.5 overflow-x-auto px-4.5 sm:mx-0 sm:px-0 lg:overflow-visible">
        <div className="min-w-[640px] overflow-clip rounded-3xl border border-le-line bg-white" style={{ ["--cols" as string]: cols }}>
          {/* Cabeçalho com produtos */}
          <div className="sticky top-22 z-10 grid grid-cols-[minmax(150px,0.8fr)_repeat(var(--cols),minmax(180px,1fr))] border-b border-le-line bg-white/95 supports-backdrop-filter:backdrop-blur-xl">
            <div className="sticky left-0 flex items-end bg-white p-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-le-muted">
              Especificação
            </div>
            <AnimatePresence initial={false} mode="popLayout">
              {selected.map((p) => (
                <m.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative border-l border-le-line p-4"
                >
                  <button
                    onClick={() => go(selected.filter((s) => s.id !== p.id).map((s) => s.slug))}
                    aria-label={`Remover ${p.name}`}
                    className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-le-muted transition-colors hover:bg-le-subtle hover:text-le-text"
                  >
                    <X size={14} />
                  </button>
                  <Link href={`/vitrine/${p.slug}`} className="group block">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-le-subtle">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt={p.name} fill sizes="240px" className="object-contain p-4 mix-blend-multiply transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <Package className="absolute left-1/2 top-1/2 -translate-1/2 text-slate-300" size={40} />
                      )}
                    </span>
                    <span className="mt-3 block font-mono text-[11px] text-le-muted">{p.sku}</span>
                    <span className="mt-0.5 block font-heading text-[15px] font-semibold leading-tight tracking-[-0.03em] text-le-text group-hover:text-le-blue">
                      {p.name}
                    </span>
                  </Link>
                  <div className="mt-3 flex gap-1.5">
                    <a
                      href={buildWhatsAppUrl({ sku: p.sku, productName: p.name })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-le-whatsapp-strong text-[11px] font-semibold text-white hover:bg-le-whatsapp-strong/90"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" /> Cotar
                    </a>
                    <a
                      href={`/vitrine/${p.slug}/ficha-tecnica`}
                      download
                      aria-label={`Baixar ficha técnica de ${p.name}`}
                      title="Ficha técnica (PDF)"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-le-line text-le-muted hover:border-le-blue-border hover:text-le-blue"
                    >
                      <FileDown size={14} />
                    </a>
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
            {selected.length < COMPARE_MAX && (
              <div className="flex flex-col border-l border-le-line p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-le-muted">Adicionar</p>
                <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                  {suggestions.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => go([...selected.map((s) => s.slug), p.slug])}
                      className="group flex items-center gap-2.5 rounded-xl border border-dashed border-le-line p-1.5 pr-2 text-left transition-colors hover:border-le-blue hover:bg-le-subtle"
                    >
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-le-subtle">
                        {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="36px" className="object-contain p-1 mix-blend-multiply" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-le-text">{p.name}</span>
                      <Plus size={13} className="shrink-0 text-le-muted group-hover:text-le-blue" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Linhas de especificação */}
          <m.div layout>
            {visibleRows.map((r) => (
              <m.div
                layout="position"
                key={r.key}
                className={cn(
                  "grid grid-cols-[minmax(150px,0.8fr)_repeat(var(--cols),minmax(180px,1fr))] border-b border-le-line text-[13px] last:border-0",
                  r.differs && "bg-le-subtle",
                )}
              >
                <div className={cn("sticky left-0 flex items-center gap-2 px-5 py-3.5 text-le-muted", r.differs ? "bg-le-subtle" : "bg-white")}>
                  <SpecIcon specKey={r.key} size={14} className="shrink-0 text-le-muted" />
                  <span className="min-w-0">{r.key}</span>
                  {r.differs && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-le-blue" title="Valores diferentes" />}
                </div>
                {r.values.map((v, i) => (
                  <div key={selected[i].id} className={cn("flex items-center gap-2 border-l border-le-line px-4 py-3.5", v ? "font-medium text-le-text" : "text-[#c0c2d3]")}>
                    {v ?? "—"}
                    {r.best === i && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-le-warning-surface px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-le-warning">
                        <Crown size={10} /> maior
                      </span>
                    )}
                  </div>
                ))}
                {selected.length < COMPARE_MAX && <div className="border-l border-le-line" />}
              </m.div>
            ))}
            {visibleRows.length === 0 && (
              <p className="p-10 text-center text-sm text-le-muted">
                {selected.length === 0 ? "Nenhum equipamento selecionado." : "Nenhuma diferença entre as especificações cadastradas."}
              </p>
            )}
          </m.div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-le-ink p-6 text-white">
        <div>
          <p className="font-heading text-lg font-medium">Ainda em dúvida entre os modelos?</p>
          <p className="mt-1 text-xs text-white/70">A engenharia indica a configuração certa para a profundidade e o solo da sua obra.</p>
        </div>
        <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="le-button bg-le-yellow text-le-ink hover:bg-le-yellow">
          Falar com especialista <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}
