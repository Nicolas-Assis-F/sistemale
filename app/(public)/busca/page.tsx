import { redirect } from 'next/navigation';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.categoria) query.set('categoria', params.categoria);
  redirect(`/vitrine${query.size ? `?${query}` : ''}`);
}
