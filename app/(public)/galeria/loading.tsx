import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900">
        <div className="relative container mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
          <Skeleton className="mx-auto mb-4 h-4 w-24 bg-white/10" />
          <Skeleton className="mx-auto h-10 w-2/3 bg-white/10" />
          <Skeleton className="mx-auto mt-5 h-5 w-full max-w-xl bg-white/10" />
        </div>
      </section>

      <section className="section px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
