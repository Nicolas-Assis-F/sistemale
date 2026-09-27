import { Skeleton } from '@/components/ui/skeleton';

export function AdminSkeleton() {
  return <div role="status" aria-label="Carregando painel" className="le-admin-page">
    <span className="sr-only">Carregando dados…</span>
    <div aria-hidden="true" className="space-y-6">
      <Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
    </div>
  </div>;
}
