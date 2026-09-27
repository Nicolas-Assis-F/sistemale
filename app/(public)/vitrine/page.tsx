import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { FACET_PARAM_PREFIX, type FacetSelection } from "@/lib/catalog-utils";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
export const metadata: Metadata = {
  title: "Vitrine de equipamentos",
  description:
    "Máquinas AR-100, cabeçotes, hastes, conexões e brocas PDC. Filtre por especificação, compare e baixe a ficha técnica.",
  alternates: { canonical: "/vitrine" },
};
export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [products, params] = await Promise.all([getCatalog(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  // ?e.Torque=1.500+N·m&e.Torque=2.500+N·m → { Torque: [...] }
  const facets: FacetSelection = {};
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith(FACET_PARAM_PREFIX) || value === undefined) continue;
    facets[key.slice(FACET_PARAM_PREFIX.length)] = Array.isArray(value) ? value : [value];
  }
  return (
    <CatalogExplorer
      products={products}
      initialCategory={one(params.categoria)}
      initialQuery={one(params.q)}
      initialSort={one(params.ordem)}
      initialView={one(params.visual) === "row" ? "row" : "grid"}
      initialFacets={facets}
    />
  );
}
