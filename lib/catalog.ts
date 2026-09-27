import { unstable_cache } from "next/cache";
import { prisma } from "./db";

export interface CatalogProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  images: string[];
  specs: Record<string, string>;
  priceCents: number;
  stock: number;
  featured: boolean;
  category: { slug: string; name: string };
}

export const getCatalog = unstable_cache(
  async (): Promise<CatalogProduct[]> => {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
    });
    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      shortDesc: p.shortDesc,
      description: p.description,
      images: p.images,
      specs: p.specs as Record<string, string>,
      priceCents: p.priceCents,
      stock: p.stock,
      featured: p.featured,
      category: { slug: p.category.slug, name: p.category.name },
    }));
  },
  ["catalog-v2"],
  { tags: ["products", "categories"], revalidate: 60 },
);
