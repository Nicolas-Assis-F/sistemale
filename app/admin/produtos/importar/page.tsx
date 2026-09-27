import { prisma } from '@/lib/db';
import { ProductImport } from '@/components/admin/ProductImport';

export default async function ImportProductsPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } });
  return <ProductImport categories={categories} />;
}
