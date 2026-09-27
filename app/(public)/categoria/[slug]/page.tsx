import { notFound, permanentRedirect } from 'next/navigation';
import { getCachedCategory } from '@/lib/cache';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCachedCategory(slug);
  if (!category) notFound();
  permanentRedirect(`/vitrine?categoria=${encodeURIComponent(category.slug)}`);
}
