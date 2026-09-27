import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { COMPARE_MAX } from "@/lib/catalog-utils";
import { CompareView } from "@/components/catalog/CompareView";

export const metadata: Metadata = {
  title: "Comparar equipamentos",
  description: "Compare especificações técnicas de máquinas e componentes L&E lado a lado.",
  robots: { index: false },
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ itens?: string }> }) {
  const [products, { itens = "" }] = await Promise.all([getCatalog(), searchParams]);
  const slugs = [...new Set(itens.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, COMPARE_MAX);
  const selected = slugs.map((slug) => products.find((p) => p.slug === slug)).filter((p) => p !== undefined);

  // Sugestões: primeiro da mesma linha dos selecionados, depois o restante
  const lines = new Set(selected.map((p) => p.category.slug));
  const suggestions = products
    .filter((p) => !slugs.includes(p.slug))
    .sort((a, b) => Number(lines.has(b.category.slug)) - Number(lines.has(a.category.slug)));

  return <CompareView selected={selected} suggestions={suggestions} />;
}
