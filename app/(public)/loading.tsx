import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900">
        <div className="relative container mx-auto max-w-4xl px-4 py-20 sm:py-28">
          <Skeleton className="mb-4 h-4 w-32 bg-white/10" />
          <Skeleton className="h-11 w-3/4 bg-white/10 sm:h-14" />
          <Skeleton className="mt-3 h-11 w-1/2 bg-white/10 sm:h-14" />
          <Skeleton className="mt-5 h-5 w-full max-w-2xl bg-white/10" />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-48 bg-white/10" />
            <Skeleton className="h-12 w-48 bg-white/10" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="relative z-10 -mt-10 px-4">
        <div className="container mx-auto">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>

      {/* Serviços */}
      <section className="section bg-muted/50 px-4">
        <div className="container mx-auto">
          <Skeleton className="mb-6 h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="section bg-muted/50 px-4">
        <div className="container mx-auto">
          <Skeleton className="mb-6 h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-4/3 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="section px-4">
        <div className="container mx-auto">
          <Skeleton className="mb-6 h-8 w-56" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
