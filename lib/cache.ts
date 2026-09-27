import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { prisma } from './db';

// ─── Navegação / Home ─────────────────────────────────────────────────────────

export const getCachedNavCategories = unstable_cache(
  () => prisma.category.findMany({ orderBy: { order: 'asc' } }),
  ['nav-categories'],
  { tags: ['categories'], revalidate: 3600 }
);

export const getCachedHomeData = unstable_cache(
  async () => {
    const [categories, featured] = await Promise.all([
      prisma.category.findMany({
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { products: { where: { active: true } } } },
          // 1 produto com foto por categoria → capa visual do bento
          products: {
            where: { active: true, NOT: { images: { isEmpty: true } } },
            select: { images: true },
            orderBy: { featured: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.product.findMany({
        where: { active: true, featured: true },
        take: 6,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    // Achata a capa e remove a relação pesada do payload cacheado
    const categoriesWithCover = categories.map(({ products, ...cat }) => ({
      ...cat,
      cover: products[0]?.images?.[0] ?? null,
    }));
    return { categories: categoriesWithCover, featured };
  },
  ['home-data'],
  { tags: ['categories', 'products'], revalidate: 60 }
);

// ─── Categoria ────────────────────────────────────────────────────────────────

export const getCachedCategory = unstable_cache(
  (slug: string) => prisma.category.findUnique({ where: { slug } }),
  ['category'],
  { tags: ['categories'], revalidate: 3600 }
);

export const getCachedCategoryProducts = unstable_cache(
  (categoryId: string) =>
    prisma.product.findMany({ where: { categoryId, active: true } }),
  ['category-products'],
  { tags: ['products'], revalidate: 60 }
);

// ─── Produto ──────────────────────────────────────────────────────────────────

// unstable_cache: resultado guardado entre requests (TTL 5 min)
const _getCachedProduct = unstable_cache(
  (slug: string) =>
    prisma.product.findUnique({
      where: { slug, active: true },
      include: { category: true },
    }),
  ['product'],
  { tags: ['products'], revalidate: 300 }
);

// React.cache: deduplica dentro do MESMO request
// (evita a query dupla de generateMetadata + page component)
export const getProduct = cache((slug: string) => _getCachedProduct(slug));

export const getCachedRelatedProducts = unstable_cache(
  (categoryId: string, excludeId: string) =>
    prisma.product.findMany({
      where: { categoryId, active: true, id: { not: excludeId } },
      take: 6,
      orderBy: { updatedAt: 'desc' },
    }),
  ['related-products'],
  { tags: ['products'], revalidate: 60 },
);

// ─── Conteúdo institucional / Serviços / Galeria ───────────────────────────────

export const getCachedSiteContent = unstable_cache(
  (key: string) => prisma.siteContent.findUnique({ where: { key } }),
  ['site-content'],
  { tags: ['site-content'], revalidate: 300 }
);

export const getCachedServices = unstable_cache(
  () => prisma.serviceItem.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
  ['services'],
  { tags: ['services'], revalidate: 300 }
);

export const getCachedGalleryItems = unstable_cache(
  () => prisma.galleryItem.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
  ['gallery'],
  { tags: ['gallery'], revalidate: 300 }
);

export const getCachedGalleryPreview = unstable_cache(
  () => prisma.galleryItem.findMany({ where: { active: true }, orderBy: { order: 'asc' }, take: 6 }),
  ['gallery-preview'],
  { tags: ['gallery'], revalidate: 300 }
);

// ─── Sitemap ──────────────────────────────────────────────────────────────────

export const getCachedSitemapData = unstable_cache(
  async () => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    return { products, categories };
  },
  ['sitemap'],
  { tags: ['products', 'categories'], revalidate: 3600 },
);

// ─── Busca ────────────────────────────────────────────────────────────────────

// Cache de 30s para evitar queries repetidas a cada keystroke
export const getCachedSearchResults = unstable_cache(
  (query: string) =>
    query
      ? prisma.product.findMany({
          where: {
            active: true,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { shortDesc: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: { name: 'asc' },
        })
      : prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ['search'],
  { tags: ['products'], revalidate: 30 }
);
