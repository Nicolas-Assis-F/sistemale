import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900">
        <div className="relative container mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
          <Skeleton className="mx-auto mb-4 h-4 w-28 bg-white/10" />
          <Skeleton className="mx-auto h-10 w-2/3 bg-white/10" />
          <Skeleton className="mx-auto mt-5 h-5 w-full max-w-xl bg-white/10" />
        </div>
      </section>

      {/* História */}
      <section className="section px-4">
        <div className="container-tight space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 pb-4">
        <div className="container mx-auto">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </section>

      {/* Valores */}
      <section className="section px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
