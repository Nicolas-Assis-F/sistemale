import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Galeria */}
        <Skeleton className="aspect-square w-full rounded-2xl" />

        {/* Detalhes */}
        <div className="flex flex-col gap-4">
          <div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-px w-full" />
          <div>
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
