import { prisma } from '@/lib/db';
import { ProductImport } from '@/components/admin/ProductImport';
import { requireAdmin } from '@/lib/auth';

export default async function ImportProductsPage() {
  await requireAdmin(); // não depende só do proxy (defesa em profundidade)
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } });
  return <ProductImport categories={categories} />;
}
