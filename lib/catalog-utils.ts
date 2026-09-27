// Utilitários puros do catálogo — seguros para client components (sem Prisma).
import type { CatalogProduct } from "./catalog";

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Ordem de relevância técnica: o que um engenheiro olha primeiro. */
const SPEC_PRIORITY = [
  /torque/i,
  /capacidade|profundidade/i,
  /rota[cç][aã]o|rpm/i,
  /^motor/i,
  /di[aâ]metro/i,
  /conex[aã]o/i,
  /redu[cç][aã]o/i,
  /l[aâ]minas/i,
  /material/i,
  /comprimento/i,
];

function priorityOf(key: string) {
  const i = SPEC_PRIORITY.findIndex((re) => re.test(key));
  return i === -1 ? SPEC_PRIORITY.length : i;
}

/** Especificações mais relevantes do produto (para o hover do card e o quick view). */
export function keySpecs(product: Pick<CatalogProduct, "specs">, n = 3) {
  return Object.entries(product.specs)
    .map(([key, value], i) => ({ key, value, rank: priorityOf(key) * 100 + i }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, n)
    .map(({ key, value }) => ({ key, value }));
}

/** Rótulo curto para espaço apertado: "Capacidade informada" → "Capacidade". */
export function shortSpecLabel(key: string) {
  return key.replace(/\s+(informad[ao]|m[aá]xim[ao])$/i, "");
}

/**
 * Extrai o primeiro número de um valor técnico em pt-BR:
 * "1.500 N·m" → 1500 · "2:1" → 2 · "139 ou 152 mm" → 139 · "3,5 m" → 3.5
 */
export function parseSpecNumber(value: string): number | null {
  const m = value.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Specs em que "maior é melhor" — usado para destacar o melhor valor no comparador. */
export const HIGHER_IS_BETTER = /torque|capacidade|profundidade|rota[cç][aã]o|rpm|pot[eê]ncia/i;

export interface FacetOption {
  value: string;
  count: number;
}
export interface Facet {
  key: string;
  options: FacetOption[];
}
export type FacetSelection = Record<string, string[]>;

/**
 * Facetas derivadas dos próprios dados: uma chave de especificação vira filtro
 * quando aparece em 2+ produtos e tem entre 2 e 8 valores curtos distintos.
 * As contagens respeitam as demais facetas ativas (contagem facetada real).
 */
export function buildFacets(
  products: CatalogProduct[],
  selection: FacetSelection,
  maxFacets = 6,
): Facet[] {
  const byKey = new Map<string, Set<string>>();
  const coverage = new Map<string, number>();
  for (const p of products) {
    for (const [k, v] of Object.entries(p.specs)) {
      if (!v || v.length > 32) continue;
      if (!byKey.has(k)) byKey.set(k, new Set());
      byKey.get(k)!.add(v);
      coverage.set(k, (coverage.get(k) ?? 0) + 1);
    }
  }

  return [...byKey.entries()]
    .filter(([k, values]) => (coverage.get(k) ?? 0) >= 2 && values.size >= 2 && values.size <= 8)
    // Mais produtos cobertos primeiro; empate → relevância técnica
    .sort((a, b) => (coverage.get(b[0]) ?? 0) - (coverage.get(a[0]) ?? 0) || priorityOf(a[0]) - priorityOf(b[0]))
    .slice(0, maxFacets)
    .map(([key, values]) => {
      // Produtos que passam em todas as OUTRAS facetas
      const others = Object.fromEntries(Object.entries(selection).filter(([k]) => k !== key));
      const pool = products.filter((p) => matchesFacets(p, others));
      const options = [...values]
        .map((value) => ({ value, count: pool.filter((p) => p.specs[key] === value).length }))
        .sort((a, b) => {
          const na = parseSpecNumber(a.value);
          const nb = parseSpecNumber(b.value);
          return na !== null && nb !== null ? na - nb : a.value.localeCompare(b.value, "pt-BR");
        });
      return { key, options };
    });
}

/** OU dentro da faceta, E entre facetas. */
export function matchesFacets(product: CatalogProduct, selection: FacetSelection) {
  return Object.entries(selection).every(
    ([key, values]) => values.length === 0 || values.includes(product.specs[key]),
  );
}

export function matchesQuery(product: CatalogProduct, query: string) {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = normalize(
    `${product.name} ${product.sku} ${product.shortDesc} ${product.category.name} ${Object.values(product.specs).join(" ")}`,
  );
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/** Prefixo dos parâmetros de faceta na URL: ?e.Torque=1.500+N·m */
export const FACET_PARAM_PREFIX = "e.";

/** Máximo de equipamentos no comparador. */
export const COMPARE_MAX = 3;
