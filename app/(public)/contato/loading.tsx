import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900">
        <div className="relative container mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
          <Skeleton className="mx-auto mb-4 h-4 w-24 bg-white/10" />
          <Skeleton className="mx-auto h-10 w-1/2 bg-white/10" />
          <Skeleton className="mx-auto mt-5 h-5 w-full max-w-xl bg-white/10" />
        </div>
      </section>

      <section className="section px-4">
        <div className="container mx-auto grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Formulário */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>

          {/* Info + mapa */}
          <div className="space-y-5">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
